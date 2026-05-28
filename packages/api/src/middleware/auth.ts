import { Request, Response, NextFunction } from 'express';
import { supabaseClient, supabaseAdmin } from '../lib/supabase';
import { User } from '@mobilize/shared';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify user JWT token with Supabase auth
    const { data: { user: authUser }, error: authError } = await (supabaseClient.auth as any).getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    // Fetch user row from public database
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single();

    if (dbError || !dbUser) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User profile not setup' });
    }

    if (dbUser.is_banned) {
      return res.status(403).json({ success: false, error: 'Forbidden: Account has been suspended' });
    }

    req.user = dbUser as User;
    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
