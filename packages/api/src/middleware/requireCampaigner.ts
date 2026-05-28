import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function requireCampaigner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'campaigner') {
    return res.status(403).json({ success: false, error: 'Forbidden: Campaigner role required' });
  }
  next();
}
