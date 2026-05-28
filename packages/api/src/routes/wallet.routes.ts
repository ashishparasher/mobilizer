import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireCampaigner } from '../middleware/requireCampaigner';
import { razorpay } from '../lib/razorpay';
import crypto from 'crypto';

const router = Router();

// Apply auth + campaigner middlewares
router.use(requireAuth);
router.use(requireCampaigner);

/**
 * POST /api/wallet/create-order
 * Create a real Razorpay escrow top-up order
 */
router.post('/create-order', async (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body;

  if (!amount || Number(amount) < 500) {
    return res.status(400).json({ success: false, error: 'Minimum deposit amount is ₹500' });
  }

  try {
    const orderAmountPaise = Math.round(Number(amount) * 100);

    const order = await razorpay.orders.create({
      amount: orderAmountPaise,
      currency: 'INR',
      receipt: 'wallet_' + Date.now(),
    });

    return res.status(200).json({
      success: true,
      data: {
        order_id: order.id,
        amount: Number(amount),
        currency: 'INR',
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid',
      },
    });
  } catch (err: any) {
    console.error('Razorpay order creation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate payment order' });
  }
});

/**
 * POST /api/wallet/verify-payment
 * Verify signature and credit funds to campaigner wallet
 */
router.post('/verify-payment', async (req: AuthenticatedRequest, res: Response) => {
  const { amount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!amount || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, error: 'Missing required payment signature details' });
  }

  try {
    // 1. Verify Razorpay cryptographic signature
    const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret';
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', secret)
      .update(sign)
      .digest('hex');

    if (expectedSign !== razorpay_signature) {
      console.warn('Payment validation signature mismatch!', { expectedSign, razorpay_signature });
      return res.status(400).json({ success: false, error: 'Payment verification failed: Invalid signature' });
    }

    // 2. Fetch campaigner profile
    const { data: campaigner, error: campaignerError } = await supabaseAdmin
      .from('campaigners')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (campaignerError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found' });
    }

    const currentBalance = Number(campaigner.wallet_balance || 0);
    const addedAmount = Number(amount);
    const newBalance = currentBalance + addedAmount;

    // 3. Update campaigner wallet balance
    const { error: updateError } = await supabaseAdmin
      .from('campaigners')
      .update({ wallet_balance: newBalance })
      .eq('id', campaigner.id);

    if (updateError) throw updateError;

    // 4. Register transaction ledger
    await supabaseAdmin.from('wallet_transactions').insert({
      campaigner_id: campaigner.id,
      type: 'deposit',
      amount: addedAmount,
      balance_after: newBalance,
      reference_id: razorpay_payment_id,
      description: 'Wallet top-up',
    });

    return res.status(200).json({
      success: true,
      data: {
        success: true,
        new_balance: newBalance,
      },
    });
  } catch (err: any) {
    console.error('Wallet verify payment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify and credit wallet balance' });
  }
});

/**
 * GET /api/wallet/balance
 * Fetch campaigner escrow balance and transactions history ledger
 */
router.get('/balance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Fetch campaigner
    const { data: campaigner, error: campaignerError } = await supabaseAdmin
      .from('campaigners')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (campaignerError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found' });
    }

    // 2. Fetch recent transactions
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('campaigner_id', campaigner.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) throw txError;

    return res.status(200).json({
      success: true,
      data: {
        wallet_balance: Number(campaigner.wallet_balance || 0),
        transactions: transactions || [],
      },
    });
  } catch (err: any) {
    console.error('Fetch wallet metrics error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve wallet information' });
  }
});

/**
 * POST /api/wallet/release-all/:campaign_id
 * Bulk release pending payouts for a campaign
 */
router.post('/release-all/:campaign_id', async (req: AuthenticatedRequest, res: Response) => {
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

    // 2. Fetch pending payouts
    const { data: pendingPayouts, error: fetchError } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Fetch pending payouts error:', fetchError);
      return res.status(500).json({ success: false, error: 'Failed to retrieve pending payouts' });
    }

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return res.status(400).json({ success: false, error: 'No pending payouts to release for this campaign' });
    }

    const totalAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
    const campaignerBalance = Number(campaigner.wallet_balance || 0);

    if (campaignerBalance < totalAmount) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient wallet balance to release payouts. Required: ₹${totalAmount}, Available: ₹${campaignerBalance}` 
      });
    }

    const newBalance = campaignerBalance - totalAmount;

    // 3. Deduct campaigner wallet balance
    const { error: balanceError } = await supabaseAdmin
      .from('campaigners')
      .update({ wallet_balance: newBalance })
      .eq('id', campaigner.id);

    if (balanceError) throw balanceError;

    // 4. Update payouts status to released
    const { error: payoutUpdateError } = await supabaseAdmin
      .from('payouts')
      .update({ status: 'released' })
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending');

    if (payoutUpdateError) throw payoutUpdateError;

    // 5. Create wallet transactions log
    await supabaseAdmin.from('wallet_transactions').insert({
      campaigner_id: campaigner.id,
      type: 'withdrawal',
      amount: totalAmount,
      balance_after: newBalance,
      reference_id: `payout_bulk_${campaign_id.substring(0, 8)}`,
      description: `Roster payout disbursement for campaign ${campaign_id.substring(0, 8)}`,
    });

    return res.status(200).json({
      success: true,
      data: {
        count: pendingPayouts.length,
        released_amount: totalAmount,
        wallet_balance: newBalance,
      }
    });
  } catch (err: any) {
    console.error('Release payouts bulk error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
