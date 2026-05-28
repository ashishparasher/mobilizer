import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mobilize API is running',
    timestamp: new Date().toISOString(),
  });
});

// Example protected route
router.get('/protected-test', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'Access granted to protected route',
    user: req.user,
  });
});

export default router;
