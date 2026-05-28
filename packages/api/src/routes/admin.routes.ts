import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { sendToParticipant } from '../services/notification.service';
import { notifyNearbyParticipants } from '../utils/notifications';

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth);
router.use(requireAdmin);

// ─────────────────────────────────────────────
// GET /api/admin/stats — Real-time platform metrics
// ─────────────────────────────────────────────
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      { count: onlineParticipants },
      { count: activeCampaigns },
      { count: pendingCampaigns },
      { count: pendingCampaigners },
      { count: newUsersToday },
      payoutsToday,
      revenueToday,
      { count: unreviewedReports },
    ] = await Promise.all([
      supabaseAdmin.from('participant_profiles').select('*', { count: 'exact', head: true }).eq('is_online', true),
      supabaseAdmin.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabaseAdmin.from('campaigners').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabaseAdmin.from('payouts').select('amount, status').gte('created_at', todayISO),
      supabaseAdmin.from('wallet_transactions').select('amount').eq('type', 'platform_fee').gte('created_at', todayISO),
      supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const payoutsTodayData = (payoutsToday.data || []);
    const payoutsTodayCount = payoutsTodayData.length;
    const payoutsTodaySum = payoutsTodayData.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const revenueTodaySum = (revenueToday.data || []).reduce((s: number, t: any) => s + (t.amount || 0), 0);

    return res.json({
      success: true,
      data: {
        online_participants: onlineParticipants || 0,
        active_campaigns: activeCampaigns || 0,
        pending_approvals: (pendingCampaigns || 0) + (pendingCampaigners || 0),
        payouts_today_count: payoutsTodayCount,
        payouts_today_sum: payoutsTodaySum,
        new_registrations_today: newUsersToday || 0,
        revenue_today: revenueTodaySum,
        unreviewed_reports: unreviewedReports || 0,
      },
    });
  } catch (err: any) {
    console.error('[Admin] Stats error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/stats/charts — Chart data
// ─────────────────────────────────────────────
router.get('/stats/charts', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usersLast7, campaignsLast30, campaignStatusDist] = await Promise.all([
      supabaseAdmin.from('users').select('created_at, role').gte('created_at', sevenDaysAgo),
      supabaseAdmin.from('campaigns').select('category, created_at').gte('created_at', thirtyDaysAgo),
      supabaseAdmin.from('campaigns').select('status'),
    ]);

    // Group registrations by day
    const dayMap: Record<string, { participants: number; campaigners: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dayMap[key] = { participants: 0, campaigners: 0 };
    }
    for (const u of (usersLast7.data || [])) {
      const key = new Date(u.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (dayMap[key]) {
        if (u.role === 'participant') dayMap[key].participants++;
        else if (u.role === 'campaigner') dayMap[key].campaigners++;
      }
    }
    const registrationsChart = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));

    // Group campaigns by category
    const catMap: Record<string, number> = {};
    for (const c of (campaignsLast30.data || [])) {
      catMap[c.category] = (catMap[c.category] || 0) + 1;
    }
    const categoriesChart = Object.entries(catMap).map(([category, count]) => ({ category, count }));

    // Campaign status distribution
    const statusMap: Record<string, number> = {};
    for (const c of (campaignStatusDist.data || [])) {
      statusMap[c.status] = (statusMap[c.status] || 0) + 1;
    }
    const statusChart = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    return res.json({ success: true, data: { registrationsChart, categoriesChart, statusChart } });
  } catch (err: any) {
    console.error('[Admin] Charts error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/campaigns — Campaign list with filters
// ─────────────────────────────────────────────
router.get('/campaigns', async (req: AuthenticatedRequest, res: Response) => {
  const { status = 'pending_approval', page = '1', search = '' } = req.query;
  const pageNum = parseInt(page as string);
  const limit = 20;
  const from = (pageNum - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        campaigner:campaigners(id, org_name, verification_status, verified, created_at,
          user:users(name, phone))
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (status !== 'all') query = query.eq('status', status as string);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ success: true, data: { campaigns: data || [], total: count || 0 } });
  } catch (err: any) {
    console.error('[Admin] Campaigns list error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/campaigns/:id/approve
// ─────────────────────────────────────────────
router.patch('/campaigns/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { admin_notes = '' } = req.body;

  try {
    // 1. Fetch campaign
    const { data: campaign, error: fetchErr } = await supabaseAdmin
      .from('campaigns')
      .select('*, campaigner:campaigners(user_id, org_name)')
      .eq('id', id)
      .single();

    if (fetchErr || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    // 2. Update status to active
    const { error: updateErr } = await supabaseAdmin
      .from('campaigns')
      .update({
        status: 'active',
        approved_by: req.user!.id,
        approved_at: new Date().toISOString(),
        admin_notes,
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // 3. Notify nearby participants
    await notifyNearbyParticipants(campaign);

    // 4. Notify campaigner
    const campaignerUserId = (campaign.campaigner as any)?.user_id;
    if (campaignerUserId) {
      await sendToParticipant(
        campaignerUserId,
        `✅ Campaign Approved: ${campaign.title}`,
        `Your campaign has been approved and is now live! Participants will start applying shortly.`,
        { type: 'campaign_approved', campaignId: id },
        'campaign_approved'
      );
    }

    return res.json({ success: true, data: { message: 'Campaign approved and activated' } });
  } catch (err: any) {
    console.error('[Admin] Approve campaign error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/campaigns/:id/reject
// ─────────────────────────────────────────────
router.patch('/campaigns/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, error: 'Rejection reason is required' });
  }

  try {
    const { data: campaign, error: fetchErr } = await supabaseAdmin
      .from('campaigns')
      .select('*, campaigner:campaigners(user_id)')
      .eq('id', id)
      .single();

    if (fetchErr || !campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    await supabaseAdmin.from('campaigns').update({
      status: 'cancelled',
      admin_notes: `Rejected: ${reason}`,
      approved_by: req.user!.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id);

    // Notify campaigner
    const campaignerUserId = (campaign.campaigner as any)?.user_id;
    if (campaignerUserId) {
      await sendToParticipant(
        campaignerUserId,
        `❌ Campaign Not Approved: ${campaign.title}`,
        `Your campaign was not approved. Reason: ${reason}. Please review and resubmit.`,
        { type: 'campaign_rejected', campaignId: id, reason },
        'campaign_rejected'
      );
    }

    return res.json({ success: true, data: { message: 'Campaign rejected' } });
  } catch (err: any) {
    console.error('[Admin] Reject campaign error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/campaigns/:id/flag
// ─────────────────────────────────────────────
router.patch('/campaigns/:id/flag', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { notes = '', assigned_to } = req.body;

  try {
    await supabaseAdmin.from('campaigns').update({
      status: 'flagged',
      admin_notes: notes,
    }).eq('id', id);

    return res.json({ success: true, data: { message: 'Campaign flagged for investigation', assigned_to } });
  } catch (err: any) {
    console.error('[Admin] Flag campaign error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/users — User list with search/filters
// ─────────────────────────────────────────────
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  const { search = '', role, is_banned, page = '1' } = req.query;
  const pageNum = parseInt(page as string);
  const limit = 25;
  const from = (pageNum - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('users')
      .select(`
        *,
        profile:participant_profiles(reliability_score, is_online, city, languages)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (role) query = query.eq('role', role as string);
    if (is_banned !== undefined) query = query.eq('is_banned', is_banned === 'true');

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ success: true, data: { users: data || [], total: count || 0 } });
  } catch (err: any) {
    console.error('[Admin] Users list error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/users/:id/ban
// ─────────────────────────────────────────────
router.patch('/users/:id/ban', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason, duration_days, notify = true } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, error: 'Ban reason is required' });
  }

  try {
    const bannedUntil = duration_days
      ? new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // 1. Ban user
    await supabaseAdmin.from('users').update({
      is_banned: true,
      ban_reason: reason,
      banned_until: bannedUntil,
      banned_by: req.user!.id,
      banned_at: new Date().toISOString(),
    }).eq('id', id);

    // 2. Cancel all pending applications
    await supabaseAdmin.from('applications')
      .update({ status: 'cancelled' })
      .eq('user_id', id)
      .in('status', ['pending', 'waitlisted', 'confirmed']);

    // 3. Notify user (optional)
    if (notify) {
      const durationStr = duration_days ? `${duration_days} days` : 'permanently';
      await sendToParticipant(
        id,
        `⛔ Account Suspended`,
        `Your account has been suspended for ${durationStr}. Reason: ${reason}`,
        { type: 'account_banned', reason },
        'account_banned'
      );
    }

    return res.json({ success: true, data: { message: 'User banned successfully' } });
  } catch (err: any) {
    console.error('[Admin] Ban user error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/users/:id/unban
// ─────────────────────────────────────────────
router.patch('/users/:id/unban', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    await supabaseAdmin.from('users').update({
      is_banned: false,
      ban_reason: null,
      banned_until: null,
    }).eq('id', id);

    return res.json({ success: true, data: { message: 'User unbanned successfully' } });
  } catch (err: any) {
    console.error('[Admin] Unban user error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/payouts — All payouts with filters
// ─────────────────────────────────────────────
router.get('/payouts', async (req: AuthenticatedRequest, res: Response) => {
  const { status, page = '1', search = '' } = req.query;
  const pageNum = parseInt(page as string);
  const limit = 25;
  const from = (pageNum - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('payouts')
      .select(`
        *,
        user:users(name, phone),
        campaign:campaigns(title, category)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (status) query = query.eq('status', status as string);
    if (search) {
      // search by campaign title or user name via join — approximate using filter
      query = query.or(`upi_id.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ success: true, data: { payouts: data || [], total: count || 0 } });
  } catch (err: any) {
    console.error('[Admin] Payouts list error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/admin/payouts/:id/resolve — Resolve disputed payout
// ─────────────────────────────────────────────
router.patch('/payouts/:id/resolve', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { action, custom_amount, admin_notes = '' } = req.body;
  // action: 'approve' | 'reject' | 'partial'

  if (!['approve', 'reject', 'partial'].includes(action)) {
    return res.status(400).json({ success: false, error: 'Invalid action. Use approve, reject, or partial.' });
  }

  try {
    const { data: payout, error: fetchErr } = await supabaseAdmin
      .from('payouts')
      .select('*, user:users(id)')
      .eq('id', id)
      .single();

    if (fetchErr || !payout) {
      return res.status(404).json({ success: false, error: 'Payout not found' });
    }

    let newStatus = 'processed';
    let finalAmount = payout.amount;

    if (action === 'reject') {
      newStatus = 'reversed';
    } else if (action === 'partial') {
      if (!custom_amount || custom_amount <= 0) {
        return res.status(400).json({ success: false, error: 'custom_amount required for partial payout' });
      }
      finalAmount = custom_amount;
    }

    await supabaseAdmin.from('payouts').update({
      status: newStatus,
      amount: finalAmount,
      admin_notes,
      resolved_by: req.user!.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', id);

    // Notify participant
    const userId = (payout.user as any)?.id;
    if (userId) {
      const msg = action === 'reject'
        ? `Your disputed payout of ₹${payout.amount} has been reviewed and rejected by admin.`
        : `Your disputed payout has been resolved. ₹${finalAmount} will be credited to your UPI shortly.`;
      await sendToParticipant(userId, '💰 Payout Dispute Resolved', msg, { type: 'payout_resolved' }, 'payout_resolved');
    }

    return res.json({ success: true, data: { message: `Payout ${action}d successfully`, final_amount: finalAmount } });
  } catch (err: any) {
    console.error('[Admin] Resolve payout error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/admin/reports — Reports queue
// ─────────────────────────────────────────────
router.get('/reports', async (req: AuthenticatedRequest, res: Response) => {
  const { status = 'pending', page = '1' } = req.query;
  const pageNum = parseInt(page as string);
  const limit = 25;
  const from = (pageNum - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('reports')
      .select(`
        *,
        reporter:users!reports_reporter_id_fkey(name, phone),
        reported_user:users!reports_reported_user_id_fkey(name, phone)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (status !== 'all') query = query.eq('status', status as string);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({ success: true, data: { reports: data || [], total: count || 0 } });
  } catch (err: any) {
    console.error('[Admin] Reports list error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// PATCH /api/admin/reports/:id — Update report status
router.patch('/reports/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  try {
    await supabaseAdmin.from('reports').update({
      status,
      admin_notes,
      reviewed_by: req.user!.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);

    return res.json({ success: true, data: { message: 'Report updated' } });
  } catch (err: any) {
    console.error('[Admin] Update report error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
