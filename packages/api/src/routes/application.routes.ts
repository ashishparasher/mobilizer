import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireCampaigner } from '../middleware/requireCampaigner';
import { sendCampaignConfirmation, sendToParticipant } from '../services/notification.service';

const router = Router();

// Apply auth middleware
router.use(requireAuth);

/**
 * POST /api/applications/apply
 * Apply for a campaign, running automatic verification checks
 */
router.post('/apply', async (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id } = req.body;
  const userId = req.user!.id;

  if (!campaign_id) {
    return res.status(400).json({ success: false, error: 'campaign_id is required' });
  }

  if (req.user!.role !== 'participant') {
    return res.status(400).json({ success: false, error: 'Only participants can apply to campaigns' });
  }

  try {
    // 1. Fetch campaign details
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ success: false, error: 'This campaign is not active' });
    }

    // 2. Check if user already applied
    const { data: existingApp } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('campaign_id', campaign_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingApp) {
      return res.status(400).json({ success: false, error: 'You have already applied to this campaign' });
    }

    // 3. Fetch participant profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('participant_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ success: false, error: 'Participant profile not found' });
    }

    // Determine slots availability
    const slotsTotal = campaign.slots_total || 0;
    const slotsFilled = campaign.slots_filled || 0;

    let targetStatus: 'pending' | 'confirmed' | 'waitlisted' = 'pending';
    let autoQualified = false;

    // Define auto-qualification checks function
    const autoQualify = (participant: any, participantProfile: any, activeCampaign: any) => {
      const requirements = activeCampaign.requirements || {};
      const failedChecks: string[] = [];

      // 1. Age check
      const minAge = requirements.min_age ? Number(requirements.min_age) : 16;
      const maxAge = requirements.max_age ? Number(requirements.max_age) : 80;
      if (participant.age < minAge || participant.age > maxAge) {
        failedChecks.push('age');
      }

      // 2. Gender check
      const reqGender = requirements.gender ? requirements.gender.toLowerCase() : 'any';
      if (reqGender !== 'any' && reqGender !== participant.gender?.toLowerCase()) {
        failedChecks.push('gender');
      }

      // 3. Reliability check
      const minReliability = requirements.min_reliability ? Number(requirements.min_reliability) : 0;
      if (Number(participant.reliability_score || 0) < minReliability) {
        failedChecks.push('reliability');
      }

      // 4. Language check
      const reqLanguages = requirements.languages || [];
      const userLanguages = participantProfile.languages || [];
      if (reqLanguages.length > 0) {
        const overlaps = reqLanguages.some((lang: string) => userLanguages.includes(lang));
        if (!overlaps) {
          failedChecks.push('language');
        }
      }

      // 5. Category not blocked
      const blocked = participantProfile.blocked_categories || [];
      if (blocked.includes(activeCampaign.category)) {
        failedChecks.push('category_blocked');
      }

      // 6. Category preferred
      const preferences = participantProfile.category_preferences || [];
      if (preferences.length > 0 && !preferences.includes(activeCampaign.category)) {
        failedChecks.push('category_preference');
      }

      return {
        qualified: failedChecks.length === 0,
        failedChecks,
      };
    };

    if (slotsFilled >= slotsTotal) {
      targetStatus = 'waitlisted';
    } else {
      const qualification = autoQualify(req.user!, profile, campaign);
      if (qualification.qualified) {
        targetStatus = 'confirmed';
        autoQualified = true;
      }
    }

    // 5. Create application record
    const { data: newApplication, error: appError } = await supabaseAdmin
      .from('applications')
      .insert({
        campaign_id,
        user_id: userId,
        status: targetStatus,
        auto_qualified: autoQualified,
        confirmed_at: targetStatus === 'confirmed' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (appError || !newApplication) {
      console.error('Apply transaction error:', appError);
      return res.status(500).json({ success: false, error: 'Failed to submit campaign application' });
    }

    // 6. Trigger corresponding status notification alerts
    if (targetStatus === 'confirmed') {
      await sendCampaignConfirmation(newApplication.id);
    } else if (targetStatus === 'pending') {
      await sendToParticipant(
        userId,
        '📋 Your application is under review',
        `The organizer for campaign "${campaign.title}" is currently reviewing your profile selection.`,
        { type: 'pending', applicationId: newApplication.id, campaignId: campaign_id },
        'pending'
      );
    } else if (targetStatus === 'waitlisted') {
      await sendToParticipant(
        userId,
        '⏳ You\'re on the waitlist',
        `Slots are full for "${campaign.title}". You are placed in the waitlist queue.`,
        { type: 'waitlisted', applicationId: newApplication.id, campaignId: campaign_id },
        'waitlisted'
      );
    }

    return res.status(201).json({ success: true, data: newApplication });
  } catch (err: any) {
    console.error('Apply error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/applications/my
 * List applications of the logged in participant user
 */
router.get('/my', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const { data: apps, error } = await supabaseAdmin
      .from('applications')
      .select('*, campaign:campaigns(*)')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('Fetch my applications error:', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve applications' });
    }

    // Fetch payouts for this user
    const { data: payouts } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('user_id', userId);

    const merged = (apps || []).map((app) => {
      const payout = (payouts || []).find((p) => p.campaign_id === app.campaign_id);
      return {
        ...app,
        payout_record: payout || null,
      };
    });

    return res.status(200).json({ success: true, data: merged });
  } catch (err: any) {
    console.error('Get my apps error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/applications/campaign/:campaign_id
 * List all applications for a specific campaign (Requires Campaigner check)
 */
router.get('/campaign/:campaign_id', requireCampaigner, async (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id } = req.params;

  try {
    // 1. Get campaigner profile
    const { data: campaigner, error: campaignerError } = await supabaseAdmin
      .from('campaigners')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (campaignerError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found' });
    }

    // 2. Confirm campaign ownership
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('campaigner_id')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.campaigner_id !== campaigner.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }

    // 3. Fetch applications
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('*, user:users(id, phone, name, age, gender, reliability_score, avatar_url)')
      .eq('campaign_id', campaign_id);

    if (error) {
      console.error('Fetch campaign applications error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch campaign applications' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Get campaign apps error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/applications/:id/decision
 * Decide status on manual queue applications (Approve / Reject)
 */
router.patch('/:id/decision', requireCampaigner, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // status: 'confirmed' | 'rejected'

  if (!status || !['confirmed', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status decision must be confirmed or rejected' });
  }

  try {
    // 1. Get campaigner profile
    const { data: campaigner, error: campaignerError } = await supabaseAdmin
      .from('campaigners')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (campaignerError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found' });
    }

    // 2. Fetch application and campaign details
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*, campaign:campaigns(*)')
      .eq('id', id)
      .single();

    if (appError || !application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    // 3. Ensure owner matches
    const campaign = application.campaign as any;
    if (campaign.campaigner_id !== campaigner.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own the parent campaign' });
    }

    const originalStatus = application.status;

    // 4. If confirming, check slot constraints
    if (status === 'confirmed') {
      if (Number(campaign.slots_filled) >= Number(campaign.slots_total)) {
        return res.status(400).json({ success: false, error: 'Cannot confirm: Campaign slots are already full' });
      }
    }

    // 5. Update application
    const { data: updatedApp, error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        status,
        confirmed_at: status === 'confirmed' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedApp) {
      console.error('Error deciding application:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to record application decision' });
    }

    // 6. Notify participant of decision
    if (status === 'confirmed') {
      await sendCampaignConfirmation(id);

      // Fetch fresh campaign status to check if slots are now full
      const { data: freshCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('slots_filled, slots_total')
        .eq('id', campaign.id)
        .single();

      // If campaign slot count is met, auto-reject remaining pending applications
      if (freshCampaign && Number(freshCampaign.slots_filled) >= Number(freshCampaign.slots_total)) {
        const { data: pendingApps } = await supabaseAdmin
          .from('applications')
          .select('id, user_id')
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending');

        if (pendingApps && pendingApps.length > 0) {
          const pendingIds = pendingApps.map((a) => a.id);
          await supabaseAdmin
            .from('applications')
            .update({ status: 'rejected' })
            .in('id', pendingIds);

          for (const app of pendingApps) {
            await sendToParticipant(
              app.user_id,
              '❌ Application Roster Finalized',
              `The campaign "${campaign.title}" slots are now full.`,
              { type: 'rejected', campaignId: campaign.id },
              'rejected'
            );
          }
        }
      }
    } else {
      await sendToParticipant(
        application.user_id,
        '❌ Application Rejected',
        `Your application for "${campaign.title}" was not selected.`,
        { type: 'rejected', campaignId: campaign.id },
        'rejected'
      );

      // If we rejected/cancelled a confirmed slot, promote the oldest waitlisted participant
      if (originalStatus === 'confirmed') {
        const { data: oldestWaitlist } = await supabaseAdmin
          .from('applications')
          .select('id, user_id')
          .eq('campaign_id', campaign.id)
          .eq('status', 'waitlisted')
          .order('applied_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (oldestWaitlist) {
          await supabaseAdmin
            .from('applications')
            .update({
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
            })
            .eq('id', oldestWaitlist.id);

          await sendCampaignConfirmation(oldestWaitlist.id);
        }
      }
    }

    return res.status(200).json({ success: true, data: updatedApp });
  } catch (err: any) {
    console.error('Application decision error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/applications/:id
 * Cancel own application
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const { error } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Cancel application error:', error);
      return res.status(500).json({ success: false, error: 'Failed to cancel application' });
    }

    return res.status(200).json({ success: true, message: 'Application cancelled successfully' });
  } catch (err: any) {
    console.error('Cancel app error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
