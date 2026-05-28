import { Router, Request, Response } from 'express';
import { supabaseClient, supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user using a Supabase access token (JWT)
 */
router.post('/register', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verify token with Supabase Auth
    const { data: { user: authUser }, error: authError } = await (supabaseClient.auth as any).getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const { phone, name, age, gender, city, district, state, role, org_name, org_type } = req.body;

    if (!phone || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields: phone and role are required' });
    }

    if (!['participant', 'campaigner', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    // 2. Check if user already exists in db
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();

    if (existingUser) {
      return res.status(200).json({ success: true, data: existingUser, message: 'User already registered' });
    }

    // Calculate initial profile completeness percentage
    let profileComplete = 20; // Starts at 20% for auth + phone
    if (name) profileComplete += 20;
    if (age) profileComplete += 15;
    if (gender) profileComplete += 15;
    if (city || state) profileComplete += 30;

    // 3. Create user record
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authUser.id,
        phone,
        name,
        age: age ? parseInt(age) : null,
        gender,
        city,
        district,
        state,
        role,
        profile_complete: profileComplete,
      })
      .select()
      .single();

    if (insertError || !newUser) {
      console.error('Error creating user:', insertError);
      return res.status(500).json({ success: false, error: 'Database error creating user' });
    }

    // 4. Create role-specific profiles
    if (role === 'participant') {
      const { error: profileError } = await supabaseAdmin
        .from('participant_profiles')
        .insert({
          user_id: newUser.id,
        });

      if (profileError) {
        console.error('Error creating participant profile:', profileError);
      }
    } else if (role === 'campaigner') {
      const { error: campaignerError } = await supabaseAdmin
        .from('campaigners')
        .insert({
          user_id: newUser.id,
          org_name: org_name || `${name || 'Organization'} Group`,
          org_type: org_type || 'unspecified',
        });

      if (campaignerError) {
        console.error('Error creating campaigner profile:', campaignerError);
      }
    }

    return res.status(201).json({ success: true, data: newUser });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/auth/update-push-token
 * Update participant push notification token
 */
router.post('/update-push-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { expo_push_token } = req.body;

  if (!expo_push_token) {
    return res.status(400).json({ success: false, error: 'expo_push_token is required' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('participant_profiles')
      .update({ expo_push_token })
      .eq('user_id', req.user!.id);

    if (error) {
      console.error('Error updating push token:', error);
      return res.status(500).json({ success: false, error: 'Failed to update push token in profile' });
    }

    return res.status(200).json({ success: true, message: 'Push token updated successfully' });
  } catch (err: any) {
    console.error('Push token update error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * POST /api/auth/complete-onboarding
 * Complete campaigner onboarding: update profile + record initial wallet transaction
 * Uses supabaseAdmin to bypass RLS (avoids infinite recursion in users policy)
 */
router.post('/complete-onboarding', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { description, website_url, wallet_amount, upi_id } = req.body;

  try {
    const userId = req.user!.id;

    // 1. Fetch campaigner profile
    const { data: campaigner, error: fetchError } = await supabaseAdmin
      .from('campaigners')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError || !campaigner) {
      return res.status(404).json({ success: false, error: 'Campaigner profile not found. Please register first.' });
    }

    // 2. Update campaigner details
    const { data: updatedCampaigner, error: updateError } = await supabaseAdmin
      .from('campaigners')
      .update({
        description: description || null,
        website_url: website_url || null,
        wallet_balance: Number(wallet_amount || 0),
        verified: true,
      })
      .eq('id', campaigner.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating campaigner profile:', updateError);
      return res.status(500).json({ success: false, error: 'Failed to update campaigner profile' });
    }

    // 3. Record initial wallet transaction (if wallet_amount > 0)
    if (Number(wallet_amount) > 0) {
      const { error: txError } = await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          campaigner_id: updatedCampaigner.id,
          type: 'deposit',
          amount: Number(wallet_amount),
          balance_after: Number(wallet_amount),
          description: `Initial wallet top-up via UPI (${upi_id || 'unknown'}) during onboarding`,
        });

      if (txError) {
        console.error('Error recording wallet transaction:', txError);
        // Non-critical — wallet balance was already updated
      }
    }

    return res.status(200).json({ success: true, data: updatedCampaigner });
  } catch (err: any) {
    console.error('Complete onboarding error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
