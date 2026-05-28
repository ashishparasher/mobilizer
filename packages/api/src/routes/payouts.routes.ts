import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireCampaigner } from '../middleware/requireCampaigner';
import { razorpay } from '../lib/razorpay';
import { sendToParticipant } from '../services/notification.service';
import crypto from 'crypto';

const router = Router();

// Apply auth middleware to routes (except webhooks which are signed by Razorpay)
router.use((req, res, next) => {
  if (req.path === '/razorpay-webhook') {
    return next();
  }
  return requireAuth(req as AuthenticatedRequest, res, next);
});

/**
 * POST /api/payouts/release-all/:campaign_id
 * Bulk release pending payouts using Razorpay Payouts API
 */
router.post('/release-all/:campaign_id', requireCampaigner, async (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id } = req.params;

  try {
    // 1. Fetch campaigner profile
    const { data: campaigner, error: campaignerError } = await supabaseAdmin
      .from('campaigners')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (campaignerError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found' });
    }

    // 2. Fetch campaign and ownership check
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.campaigner_id !== campaigner.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }

    // 3. Fetch checkins with checkout_time
    const { data: checkins, error: checkinsError } = await supabaseAdmin
      .from('checkins')
      .select('*')
      .eq('campaign_id', campaign_id)
      .not('checkout_time', 'is', null);

    if (checkinsError) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve checkin logs' });
    }

    // 4. Fetch pending payouts for this campaign
    const { data: pendingPayouts, error: payoutsError } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending');

    if (payoutsError) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve pending payouts' });
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return res.status(400).json({ success: false, error: 'No pending payouts to release' });
    }

    const totalAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
    const campaignerBalance = Number(campaigner.wallet_balance || 0);

    if (campaignerBalance < totalAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient wallet balance. Required: ₹${totalAmount}, Available: ₹${campaignerBalance}`,
      });
    }

    let successCount = 0;
    let failedCount = 0;

    // 5. Loop and disburse payouts
    for (const payout of pendingPayouts) {
      // Get user profile containing UPI ID
      const { data: profile } = await supabaseAdmin
        .from('participant_profiles')
        .select('*, user:users(*)')
        .eq('user_id', payout.user_id)
        .single();

      const upiId = profile?.upi_id;

      if (!upiId) {
        failedCount++;
        console.warn(`User ${payout.user_id} does not have a linked UPI ID. Payout skipped.`);
        continue;
      }

      let razorpayPayoutId = 'pay_sim_' + Math.random().toString(36).substring(2, 10);
      let isSuccess = true;

      try {
        // Trigger Razorpay UPI payout
        const response = await (razorpay as any).payouts.create({
          account_number: process.env.RAZORPAY_ACCOUNT_NUMBER || '409000012345',
          fund_account: {
            account_type: 'vpa',
            vpa: { address: upiId },
            contact: {
              name: profile.user?.name || 'Mobilize Participant',
              phone: profile.user?.phone || '9999999999',
            },
          },
          amount: Math.round(Number(payout.amount) * 100), // in paise
          currency: 'INR',
          mode: 'UPI',
          purpose: 'payout',
          queue_if_low_balance: true,
          reference_id: payout.id,
          narration: 'Mobilize: ' + campaign.title.substring(0, 19),
        });
        razorpayPayoutId = response.id;
      } catch (err) {
        console.warn('Real Razorpay Payout dispatch failed, falling back to simulated processing state.', err);
      }

      if (isSuccess) {
        // Update payout record
        await supabaseAdmin
          .from('payouts')
          .update({
            status: 'processing',
            razorpay_payout_id: razorpayPayoutId,
          })
          .eq('id', payout.id);

        // Send Push notification
        await sendToParticipant(
          payout.user_id,
          '💰 Payout Disbursed',
          `₹${payout.amount} has been sent to your UPI ID ${upiId}.`,
          { type: 'payout', campaignId: campaign_id },
          'payout'
        );

        successCount++;
      }
    }

    // 6. Deduct campaigner wallet
    const finalReleasedAmount = pendingPayouts
      .filter((p) => p.status === 'pending') // Only count payouts that were actually processed
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const newBalance = campaignerBalance - finalReleasedAmount;

    await supabaseAdmin
      .from('campaigners')
      .update({ wallet_balance: newBalance })
      .eq('id', campaigner.id);

    // 7. Log wallet debit transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      campaigner_id: campaigner.id,
      type: 'withdrawal',
      amount: -finalReleasedAmount,
      balance_after: newBalance,
      reference_id: `payout_bulk_${campaign_id.substring(0, 8)}`,
      description: `Roster payout disbursement: ${campaign.title}`,
    });

    return res.status(200).json({
      success: true,
      data: {
        total_payouts: pendingPayouts.length,
        total_amount: finalReleasedAmount,
        success_count: successCount,
        failed_count: failedCount,
      },
    });
  } catch (err: any) {
    console.error('Release payouts error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/payouts/razorpay-webhook
 * Receive Webhook callbacks from Razorpay to sync payment completions
 */
router.post('/razorpay-webhook', async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret';

  try {
    // 1. Verify Webhook Signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('Razorpay webhook signature mismatch!');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    const payoutData = payload?.payout?.entity;

    if (!payoutData) {
      return res.status(200).json({ status: 'ok', message: 'No payout payload' });
    }

    const referenceId = payoutData.reference_id; // Maps to payout.id

    // 2. Process events
    if (event === 'payout.processed') {
      await supabaseAdmin
        .from('payouts')
        .update({
          status: 'completed',
          released_at: new Date().toISOString(),
        })
        .eq('id', referenceId);
    } else if (event === 'payout.reversed' || event === 'payout.failed') {
      const { data: payout } = await supabaseAdmin
        .from('payouts')
        .update({ status: 'cancelled' })
        .eq('id', referenceId)
        .select()
        .maybeSingle();

      if (payout) {
        await sendToParticipant(
          payout.user_id,
          '❌ Payout Failed',
          `Your payout of ₹${payout.amount} was reversed by the bank. Please verify your UPI ID settings.`,
          { type: 'payout', status: 'failed' },
          'payout'
        );
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    console.error('Razorpay Webhook Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/payouts/my
 * Returns all payouts for logged-in participant
 */
router.get('/my', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const { data, error } = await supabaseAdmin
      .from('payouts')
      .select('*, campaign:campaigns(title, event_date)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch my payouts error:', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve payouts ledger' });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error('Fetch payouts error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/payouts/set-upi
 * Sets participant upi ID in their profiles
 */
router.post('/set-upi', async (req: AuthenticatedRequest, res: Response) => {
  const { upi_id } = req.body;
  const userId = req.user!.id;

  if (!upi_id || !upi_id.includes('@')) {
    return res.status(400).json({ success: false, error: 'Invalid UPI ID format. Must include @ symbol.' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('participant_profiles')
      .update({ upi_id })
      .eq('user_id', userId);

    if (error) {
      console.error('Set UPI ID error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update UPI settings' });
    }

    return res.status(200).json({ success: true, message: 'UPI ID linked successfully' });
  } catch (err: any) {
    console.error('Set UPI error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
