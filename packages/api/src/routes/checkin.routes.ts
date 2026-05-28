import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getDistanceInMeters } from '../utils/haversine';
import { sendToParticipant } from '../services/notification.service';

const router = Router();

// Apply auth middleware
router.use(requireAuth);

/**
 * Helper to parse a campaigners time string (e.g. "09:30" or "09:30 AM") into hours and minutes
 */
const parseTimeString = (timeStr: string) => {
  if (!timeStr) return { hours: 0, minutes: 0 };
  const parts = timeStr.split(' ');
  const [hoursStr, minutesStr] = parts[0].split(':');
  let hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  
  if (parts[1]) {
    const modifier = parts[1].toLowerCase();
    if (modifier === 'pm' && hours < 12) {
      hours += 12;
    }
    if (modifier === 'am' && hours === 12) {
      hours = 0;
    }
  }
  return { hours, minutes };
};

/**
 * POST /api/checkin
 * Validate GPS proximity and perform check-in registration
 */
router.post('/checkin', async (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id, lat, lng, selfie_url } = req.body;
  const userId = req.user!.id;

  if (!campaign_id || lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'campaign_id, lat, and lng coordinates are required' });
  }

  try {
    // 1. Find confirmed application for this user + campaign
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (appError || !application) {
      return res.status(400).json({
        success: false,
        error: 'You do not have a confirmed application for this campaign. Access denied.',
      });
    }

    // 2. Check not already checked in (no existing checkin without checkout)
    const { data: existingCheckin } = await supabaseAdmin
      .from('checkins')
      .select('id')
      .eq('application_id', application.id)
      .is('checkout_time', null)
      .maybeSingle();

    if (existingCheckin) {
      return res.status(400).json({ success: false, error: 'You are already checked in to this campaign' });
    }

    // 3. Fetch campaign to run GPS and time verification
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign details not found' });
    }

    // Check event date is today
    const todayStr = new Date().toISOString().split('T')[0];
    const campaignDateStr = new Date(campaign.event_date || campaign.date).toISOString().split('T')[0];
    
    if (todayStr !== campaignDateStr) {
      return res.status(400).json({ success: false, error: 'GPS check-in failed: Event is not scheduled for today.' });
    }

    // Check event time window: start_time - 30min to start_time + duration_hrs + 1hr
    const { hours: startHours, minutes: startMinutes } = parseTimeString(campaign.start_time);
    const eventStart = new Date(campaign.event_date || campaign.date);
    eventStart.setHours(startHours, startMinutes, 0, 0);

    const durationHrs = Number(campaign.duration_hrs || 0);
    const now = new Date();

    const windowStart = new Date(eventStart.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(eventStart.getTime() + (durationHrs + 1) * 60 * 60 * 1000);

    if (now < windowStart || now > windowEnd) {
      return res.status(400).json({ 
        success: false, 
        error: `GPS check-in failed: Check-in window is currently closed. Event hours are ${campaign.start_time} for ${durationHrs} hours.` 
      });
    }

    // 4. Calculate distance using Haversine
    if (!campaign.location || !campaign.location.coordinates) {
      return res.status(500).json({ success: false, error: 'Campaign location coordinates are missing.' });
    }

    const campaignLng = campaign.location.coordinates[0];
    const campaignLat = campaign.location.coordinates[1];
    const distanceMeters = getDistanceInMeters(lat, lng, campaignLat, campaignLng);

    if (distanceMeters > 200) {
      return res.status(400).json({
        success: false,
        error: `Too far from venue. You must be within 200m. Current distance: ${distanceMeters.toFixed(0)}m.`,
      });
    }

    // 5. Create checkin record
    const pointWkt = `POINT(${lng} ${lat})`;
    const { data: checkin, error: checkinError } = await supabaseAdmin
      .from('checkins')
      .insert({
        application_id: application.id,
        user_id: userId,
        campaign_id: campaign_id,
        checkin_location: pointWkt,
        checkin_selfie_url: selfie_url,
        verified: true,
      })
      .select()
      .single();

    if (checkinError || !checkin) {
      console.error('Checkin DB error:', checkinError);
      return res.status(500).json({ success: false, error: 'Failed to record checkin' });
    }

    return res.status(201).json({ success: true, data: checkin });
  } catch (err: any) {
    console.error('Checkin error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/checkout
 * Perform check-out, calculate hours, bonuses, and register payouts
 */
router.post('/checkout', async (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id, lat, lng } = req.body;
  const userId = req.user!.id;

  if (!campaign_id || lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'campaign_id, lat, and lng coordinates are required' });
  }

  try {
    // 1. Find active checkin record (without checkout_time)
    const { data: checkin, error: checkinError } = await supabaseAdmin
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('campaign_id', campaign_id)
      .is('checkout_time', null)
      .maybeSingle();

    if (checkinError || !checkin) {
      return res.status(400).json({
        success: false,
        error: 'Active checkin record not found. You must check-in first.',
      });
    }

    // 2. Fetch campaign details
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign details not found' });
    }

    // 3. Process checkout values
    const checkoutTimeStr = new Date().toISOString();
    const checkinTime = new Date(checkin.checkin_time);
    const checkoutTime = new Date(checkoutTimeStr);

    // Calculate hours attended
    const diffMs = checkoutTime.getTime() - checkinTime.getTime();
    const hoursAttended = Math.max(0.01, Number((diffMs / (1000 * 60 * 60)).toFixed(2)));

    const pointWkt = `POINT(${lng} ${lat})`;

    // Update checkin row
    const { error: updateError } = await supabaseAdmin
      .from('checkins')
      .update({
        checkout_time: checkoutTimeStr,
        checkout_location: pointWkt,
        hours_attended: hoursAttended,
      })
      .eq('id', checkin.id);

    if (updateError) {
      console.error('Checkout write error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to record checkout details' });
    }

    // 4. Calculate Payout allocation
    const targetDuration = Number(campaign.duration_hrs || 1);
    const fullPayout = Number(campaign.payout || 0);
    const minHours = targetDuration * 0.8;
    
    let basePayout = 0;
    if (hoursAttended >= minHours) {
      basePayout = fullPayout;
    } else {
      basePayout = (hoursAttended / targetDuration) * fullPayout;
    }

    // Calculate bonuses
    let bonusPayout = 0;

    // Check punctuality bonus (checked in on time - within 15 min of start_time)
    const { hours: startHours, minutes: startMinutes } = parseTimeString(campaign.start_time);
    const eventStart = new Date(campaign.event_date || campaign.date);
    eventStart.setHours(startHours, startMinutes, 0, 0);

    const punctualityCutoff = new Date(eventStart.getTime() + 15 * 60 * 1000);
    const checkedInOnTime = checkinTime <= punctualityCutoff;

    if (campaign.has_punctuality_bonus && checkedInOnTime) {
      bonusPayout += Number(campaign.punctuality_bonus_amount || 0);
    }

    // Check full duration bonus
    if (campaign.has_duration_bonus && hoursAttended >= targetDuration) {
      bonusPayout += Number(campaign.duration_bonus_amount || 0);
    }

    const totalPayout = Math.max(0, Math.round((basePayout + bonusPayout) * 100) / 100);

    // 5. Create payout record
    let payoutRecord: any = null;
    if (totalPayout > 0) {
      const { data: payout, error: payoutError } = await supabaseAdmin
        .from('payouts')
        .insert({
          user_id: userId,
          campaign_id: campaign_id,
          amount: totalPayout,
          status: 'pending',
        })
        .select()
        .single();

      if (payoutError) {
        console.error('Payout database error:', payoutError);
      }
      payoutRecord = payout;
    }

    // 6. Update participant reliability score (async/background update)
    try {
      const currentScore = Number(req.user!.reliability_score || 70);
      const wasReliable = hoursAttended >= minHours;
      const newScore = Math.min(100, Math.max(50, Math.round(currentScore + (wasReliable ? 2 : -5))));

      await supabaseAdmin
        .from('users')
        .update({ reliability_score: newScore })
        .eq('id', userId);
    } catch (relError) {
      console.error('Reliability score update failure:', relError);
    }

    // 7. Send push notification
    try {
      await sendToParticipant(
        userId,
        '💰 Payment Pending Approval',
        `₹${totalPayout} will be paid to your wallet within 2 hours.`,
        { type: 'payout', campaignId: campaign_id },
        'payout'
      );
    } catch (notifErr) {
      console.error('Checkout notification error:', notifErr);
    }

    return res.status(200).json({
      success: true,
      data: {
        hours_attended: hoursAttended,
        payout_amount: totalPayout,
        bonus: bonusPayout,
        payout_id: payoutRecord?.id || null,
      },
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/checkin/status/:campaign_id
 * Returns current check-in and checkout status of a user
 */
router.get('/status/:campaign_id', async (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id } = req.params;
  const userId = req.user!.id;

  try {
    const { data: checkin, error } = await supabaseAdmin
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('campaign_id', campaign_id)
      .order('checkin_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching checkin status:', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve checkin status' });
    }

    if (!checkin) {
      return res.status(200).json({ success: true, data: { status: 'not_checked_in', checkin: null } });
    }

    if (checkin.checkout_time) {
      return res.status(200).json({ success: true, data: { status: 'checked_out', checkin } });
    }

    return res.status(200).json({ success: true, data: { status: 'checked_in', checkin } });
  } catch (err: any) {
    console.error('Checkin status lookup error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
