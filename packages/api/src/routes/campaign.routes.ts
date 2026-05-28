import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireCampaigner } from '../middleware/requireCampaigner';
import { notifyNearbyParticipants } from '../utils/notifications';

const router = Router();

// Apply auth middleware to all campaign routes
router.use(requireAuth);

/**
 * GET /api/campaigns/feed
 * Discover nearby campaigns based on location, radius, and preferences
 */
router.get('/feed', async (req: AuthenticatedRequest, res: Response) => {
  const { lat, lng, radius = '10', page = '1' } = req.query;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'User coordinates (lat, lng) are required' });
  }

  const userLat = parseFloat(lat as string);
  const userLng = parseFloat(lng as string);
  const searchRadius = parseInt(radius as string);
  const pageNum = parseInt(page as string);
  const limit = 10;
  const from = (pageNum - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_nearby_campaigns', {
        user_lat: userLat,
        user_lng: userLng,
        radius_km: searchRadius,
        p_user_id: req.user!.id,
      })
      .range(from, to);

    if (error) {
      console.error('Error fetching campaigns feed:', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve campaigns' });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error('Feed retrieval error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/campaigns/my/list
 * List all campaigns owned by the campaigner
 */
router.get('/my/list', requireCampaigner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Get campaigner profile id
    const { data: campaigner, error: campaignerError } = await supabaseAdmin
      .from('campaigners')
      .select('id')
      .eq('user_id', req.user!.id)
      .single();

    if (campaignerError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found' });
    }

    // 2. Fetch campaigns with application count
    // Using Supabase count feature on applications table
    const { data: campaigns, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('*, applications(count)')
      .eq('campaigner_id', campaigner.id);

    if (fetchError) {
      console.error('Error fetching campaigner campaigns:', fetchError);
      return res.status(500).json({ success: false, error: 'Failed to retrieve campaigner campaigns' });
    }

    // Map application counts for cleaner API structure
    const formattedCampaigns = (campaigns || []).map(campaign => {
      const appCount = campaign.applications && campaign.applications[0] 
        ? campaign.applications[0].count 
        : 0;
      const { applications, ...rest } = campaign;
      return {
        ...rest,
        applications_count: appCount,
      };
    });

    return res.status(200).json({ success: true, data: formattedCampaigns });
  } catch (err: any) {
    console.error('Get my campaigns error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * GET /api/campaigns/estimate-participants
 * Get estimated matching participants count grouped by city
 */
router.get('/estimate-participants', async (req: Request, res: Response) => {
  const filterStr = req.query.filters as string;
  let filters: any = {};
  if (filterStr) {
    try {
      filters = JSON.parse(filterStr);
    } catch (e) {
      // Ignore or log
    }
  }

  try {
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, age, gender, city, reliability_score, profile:participant_profiles(languages, blocked_categories, category_preferences)');

    if (error) throw error;

    const minAge = filters.min_age ? Number(filters.min_age) : 16;
    const maxAge = filters.max_age ? Number(filters.max_age) : 80;
    const reqGender = filters.gender ? filters.gender.toLowerCase() : 'any';
    const minReliability = filters.min_reliability ? Number(filters.min_reliability) : 0;
    const reqLanguages = filters.languages || [];
    const category = filters.category || 'brand_activation';

    const matching = (users || []).filter((user: any) => {
      if (user.age < minAge || user.age > maxAge) return false;
      if (reqGender !== 'any' && reqGender !== user.gender?.toLowerCase()) return false;
      if (Number(user.reliability_score || 0) < minReliability) return false;
      
      const profile = user.profile;
      if (profile) {
        if (reqLanguages.length > 0) {
          const userLanguages = profile.languages || [];
          const overlap = reqLanguages.some((lang: string) => userLanguages.includes(lang));
          if (!overlap) return false;
        }
        const blocked = profile.blocked_categories || [];
        if (blocked.includes(category)) return false;
        const prefs = profile.category_preferences || [];
        if (prefs.length > 0 && !prefs.includes(category)) return false;
      }
      return true;
    });

    const breakdown: Record<string, number> = {};
    matching.forEach((m: any) => {
      const city = m.city || 'Other';
      breakdown[city] = (breakdown[city] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      data: {
        total: matching.length,
        breakdown,
      },
    });
  } catch (err: any) {
    console.error('Estimate error:', err);
    return res.status(500).json({ success: false, error: 'Failed to estimate participants' });
  }
});

/**
 * GET /api/campaigns/:id
 * Get details of a single campaign
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('*, campaigner:campaigners(*)')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    return res.status(200).json({ success: true, data: campaign });
  } catch (err: any) {
    console.error('Get campaign error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign (Locks budget and makes transaction ledger)
 */
router.post('/', requireCampaigner, async (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    description,
    category,
    event_date,
    start_time,
    duration_hrs,
    location_name,
    location_address,
    lat,
    lng,
    payout,
    payout_type = 'cash',
    slots_total,
    visibility_radius = 10,
    is_urgent = false,
    is_private = false,
    dress_code,
    requirements = {},
  } = req.body;

  if (
    !title ||
    !description ||
    !category ||
    !event_date ||
    !start_time ||
    duration_hrs === undefined ||
    !location_name ||
    !location_address ||
    lat === undefined ||
    lng === undefined ||
    payout === undefined ||
    slots_total === undefined
  ) {
    return res.status(400).json({ success: false, error: 'Missing required campaign configuration fields' });
  }

  try {
    // 1. Fetch campaigner profile and wallet
    const { data: campaigner, error: campaignerError } = await supabaseAdmin
      .from('campaigners')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (campaignerError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found' });
    }

    // Budget math: payout * total slots * 1.1 (10% admin platform commission fee)
    const requiredBudget = slots_total * payout * 1.1;

    if (Number(campaigner.wallet_balance) < requiredBudget) {
      return res.status(400).json({
        success: false,
        error: `Insufficient wallet balance. Required: ₹${requiredBudget.toFixed(2)}, Available: ₹${Number(campaigner.wallet_balance).toFixed(2)}`,
      });
    }

    const pointWkt = `POINT(${lng} ${lat})`;

    // Determine initial status based on campaigner's verification status
    const initialStatus = campaigner.verified ? 'active' : 'pending_approval';

    // 2. Perform budget locking and campaigner wallet decrement
    const newBalance = Number(campaigner.wallet_balance) - requiredBudget;

    const { error: walletUpdateError } = await supabaseAdmin
      .from('campaigners')
      .update({ wallet_balance: newBalance })
      .eq('id', campaigner.id);

    if (walletUpdateError) {
      console.error('Wallet update error during budget locking:', walletUpdateError);
      return res.status(500).json({ success: false, error: 'Failed to reserve campaign budget' });
    }

    // 3. Create the campaign row
    const { data: campaign, error: createError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        campaigner_id: campaigner.id,
        title,
        description,
        category,
        event_date,
        start_time,
        duration_hrs,
        location_name,
        location_address,
        location: pointWkt,
        payout,
        payout_type,
        slots_total,
        status: initialStatus,
        dress_code,
        requirements,
        visibility_radius,
        is_urgent,
        is_private,
        budget_locked: requiredBudget,
      })
      .select()
      .single();

    if (createError || !campaign) {
      console.error('Error creating campaign:', createError);
      // Rollback wallet balance
      await supabaseAdmin.from('campaigners').update({ wallet_balance: campaigner.wallet_balance }).eq('id', campaigner.id);
      return res.status(500).json({ success: false, error: 'Failed to create campaign' });
    }

    // 4. Create ledger wallet transaction entry
    await supabaseAdmin.from('wallet_transactions').insert({
      campaigner_id: campaigner.id,
      type: 'payout_hold',
      amount: -requiredBudget,
      balance_after: newBalance,
      campaign_id: campaign.id,
      description: `Locked budget for campaign: ${title} (${slots_total} slots @ ₹${payout})`,
    });

    // 5. Notify nearby participants asynchronously if the campaign went directly active
    if (initialStatus === 'active') {
      // Fetch full coordinates again for notifications
      const campaignWithCoords = {
        ...campaign,
        lat,
        lng,
      };
      notifyNearbyParticipants(campaignWithCoords).catch(err =>
        console.error('Error in notifyNearbyParticipants trigger:', err)
      );
    }

    return res.status(201).json({ success: true, data: campaign });
  } catch (err: any) {
    console.error('Create campaign error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/campaigns/:id
 * Update details of a campaign (Only allowed in draft or active status)
 */
router.patch('/:id', requireCampaigner, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

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

    // 2. Fetch current campaign state
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.campaigner_id !== campaigner.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }

    // Ensure status is editable
    if (!['draft', 'active'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot update campaign. Current status is ${campaign.status}. Editing is only allowed for draft or active campaigns.`,
      });
    }

    // Protect columns
    const prohibited = ['id', 'campaigner_id', 'status', 'budget_locked', 'slots_filled', 'slots_waitlist', 'created_at', 'updated_at'];
    prohibited.forEach(field => delete updates[field]);

    if (updates.lat !== undefined && updates.lng !== undefined) {
      updates.location = `POINT(${updates.lng} ${updates.lat})`;
      delete updates.lat;
      delete updates.lng;
    }

    const { data: updatedCampaign, error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update campaign error:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update campaign details' });
    }

    return res.status(200).json({ success: true, data: updatedCampaign });
  } catch (err: any) {
    console.error('Patch campaign error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/campaigns/:id/status
 * Transition campaign status (e.g. active -> paused, active -> completed)
 */
router.patch('/:id/status', requireCampaigner, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'status transition field is required' });
  }

  try {
    // 1. Get campaigner profile
    const { data: campaigner, error: campaignerError } = await supabaseAdmin
      .from('campaigners')
      .select('id, wallet_balance')
      .eq('user_id', req.user!.id)
      .single();

    if (campaignerError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found' });
    }

    // 2. Fetch current campaign status
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.campaigner_id !== campaigner.id) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
    }

    // Validate permitted transitions
    const allowedTransitions: Record<string, string[]> = {
      active: ['paused', 'completed', 'cancelled'],
      paused: ['active', 'completed', 'cancelled'],
      draft: ['pending_approval', 'cancelled'],
      pending_approval: ['cancelled'],
    };

    const currentStatus = campaign.status;
    const targets = allowedTransitions[currentStatus] || [];

    if (!targets.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition. Cannot move from '${currentStatus}' to '${status}'. Allowed: ${targets.join(', ')}`,
      });
    }

    const { data: updatedCampaign, error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error modifying campaign status:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update campaign status' });
    }

    // If campaign is cancelled, handle budget refunding
    if (status === 'cancelled' && Number(campaign.budget_locked) > 0) {
      const refundAmount = Number(campaign.budget_locked);
      const refundedBalance = Number(campaigner.wallet_balance) + refundAmount;

      await supabaseAdmin
        .from('campaigners')
        .update({ wallet_balance: refundedBalance })
        .eq('id', campaigner.id);

      await supabaseAdmin.from('wallet_transactions').insert({
        campaigner_id: campaigner.id,
        type: 'refund',
        amount: refundAmount,
        balance_after: refundedBalance,
        campaign_id: campaign.id,
        description: `Refund budget locked for cancelled campaign: ${campaign.title}`,
      });

      // Clear budget_locked
      await supabaseAdmin.from('campaigns').update({ budget_locked: 0 }).eq('id', campaign.id);
    }

    return res.status(200).json({ success: true, data: updatedCampaign });
  } catch (err: any) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/campaigns/:id/broadcast
 * Broadcast push notification messages to target participants
 */
router.post('/:id/broadcast', requireCampaigner, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { message, targetScope, targetUserIds } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message body is required' });
  }

  try {
    let finalUserIds: string[] = [];

    if (targetUserIds && targetUserIds.length > 0) {
      finalUserIds = targetUserIds;
    } else {
      // Query users based on targetScope
      let query = supabaseAdmin
        .from('applications')
        .select('user_id')
        .eq('campaign_id', id);

      if (targetScope && targetScope !== 'all') {
        query = query.eq('status', targetScope);
      }

      const { data: apps, error: appsError } = await query;
      if (appsError) throw appsError;
      finalUserIds = (apps || []).map((a: any) => a.user_id).filter(Boolean);
    }

    if (finalUserIds.length === 0) {
      return res.status(200).json({ success: true, message: 'No recipients matched the targets', dispatchedCount: 0 });
    }

    // Fetch campaign title
    const { data: campaign } = await supabaseAdmin.from('campaigns').select('title').eq('id', id).single();
    const campaignTitle = campaign?.title || 'Mobilize Event Update';

    // Insert notification records
    const notificationRows = finalUserIds.map((uid) => ({
      user_id: uid,
      title: `Message from Organizer: ${campaignTitle}`,
      body: message,
      type: 'broadcast',
      data: { campaign_id: id },
    }));

    const { error: notifyInsertError } = await supabaseAdmin
      .from('notifications')
      .insert(notificationRows);

    if (notifyInsertError) {
      console.error('Error inserting notifications:', notifyInsertError);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully broadcasted to ${finalUserIds.length} recipients`,
      dispatchedCount: finalUserIds.length,
    });
  } catch (err: any) {
    console.error('Broadcast route error:', err);
    return res.status(500).json({ success: false, error: 'Failed to broadcast message' });
  }
});

export default router;
