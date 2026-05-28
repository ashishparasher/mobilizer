import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply auth middleware
router.use(requireAuth);

/**
 * GET /api/notifications
 * Fetch user's notification list
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { unread_only } = req.query;

  try {
    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unread_only === 'true') {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve notifications' });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err: any) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications belonging to the user as read
 */
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return res.status(500).json({ success: false, error: 'Failed to update notifications read status' });
    }

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    console.error('Mark read notifications error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
