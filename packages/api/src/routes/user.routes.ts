import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all user routes
router.use(requireAuth);

/**
 * GET /api/user/profile
 * Get user profile and linked role-specific profile (participant or campaigner)
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;

  try {
    let profileData: any = null;

    if (role === 'participant') {
      const { data, error } = await supabaseAdmin
        .from('participant_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) console.error('Error fetching participant profile:', error);
      profileData = data;
    } else if (role === 'campaigner') {
      const { data, error } = await supabaseAdmin
        .from('campaigners')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) console.error('Error fetching campaigner profile:', error);
      profileData = data;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...req.user,
        profile: profileData,
      },
    });
  } catch (err: any) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/user/profile
 * Update fields in the users table
 */
router.patch('/profile', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const updates = req.body;

  // Protect sensitive columns from ad-hoc updates
  const prohibited = ['id', 'auth_id', 'role', 'verified', 'aadhaar_verified', 'reliability_score', 'created_at', 'updated_at', 'is_banned'];
  prohibited.forEach(field => delete updates[field]);

  try {
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error || !updatedUser) {
      console.error('Error updating user:', error);
      return res.status(500).json({ success: false, error: 'Failed to update user profile' });
    }

    return res.status(200).json({ success: true, data: updatedUser });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/user/participant-profile
 * Update fields in the participant_profiles table
 */
router.patch('/participant-profile', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const updates = req.body;

  if (req.user!.role !== 'participant') {
    return res.status(400).json({ success: false, error: 'User is not a participant' });
  }

  // Prevent modifying critical fields
  delete updates.user_id;
  delete updates.location;
  delete updates.last_location_update;

  try {
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('participant_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !updatedProfile) {
      console.error('Error updating participant profile:', error);
      return res.status(500).json({ success: false, error: 'Failed to update participant profile' });
    }

    return res.status(200).json({ success: true, data: updatedProfile });
  } catch (err: any) {
    console.error('Update participant profile error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/user/location
 * Update participant geolocation coordinates
 */
router.patch('/location', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'lat and lng coordinates are required' });
  }

  if (req.user!.role !== 'participant') {
    return res.status(400).json({ success: false, error: 'Only participants can update geolocation' });
  }

  try {
    // PostGIS location point definition (WKT format: POINT(lng lat))
    const pointWkt = `POINT(${lng} ${lat})`;

    const { error } = await supabaseAdmin
      .from('participant_profiles')
      .update({
        location: pointWkt,
        last_location_update: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating location:', error);
      return res.status(500).json({ success: false, error: 'Failed to update location coordinates' });
    }

    return res.status(200).json({ success: true, message: 'Location updated successfully' });
  } catch (err: any) {
    console.error('Update location error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/user/online-status
 * Toggle online availability flag
 */
router.patch('/online-status', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { is_online } = req.body;

  if (is_online === undefined) {
    return res.status(400).json({ success: false, error: 'is_online boolean is required' });
  }

  if (req.user!.role !== 'participant') {
    return res.status(400).json({ success: false, error: 'Only participants can update online status' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('participant_profiles')
      .update({ is_online })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating online status:', error);
      return res.status(500).json({ success: false, error: 'Failed to update online status' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error('Update online status error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
