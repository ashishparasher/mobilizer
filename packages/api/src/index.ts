import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';
import { supabaseAdmin } from './lib/supabase';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import campaignRoutes from './routes/campaign.routes';
import applicationRoutes from './routes/application.routes';
import checkinRoutes from './routes/checkin.routes';
import notificationRoutes from './routes/notification.routes';
import walletRoutes from './routes/wallet.routes';
import payoutsRoutes from './routes/payouts.routes';
import heatmapRoutes from './routes/heatmap.routes';
import adminRoutes from './routes/admin.routes';
import './jobs/reliabilityScorer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ─── Request Logging ──────────────────────────────────────────
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// ─── CORS ─────────────────────────────────────────────────────
app.use(cors());

// ─── Body Parsing ─────────────────────────────────────────────
app.use(express.json());

// ─── Rate Limiting (global) ───────────────────────────────────
app.use(generalLimiter);

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api', checkinRoutes); // Maps POST /api/checkin and POST /api/checkout
app.use('/api/notifications', notificationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/admin', adminRoutes);

// ─── Enhanced Health Check ────────────────────────────────────
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    const dbStatus = error ? 'error' : 'connected';

    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        db: dbStatus,
        uptime: Math.floor(process.uptime()),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      data: {
        status: 'error',
        timestamp: new Date().toISOString(),
        db: 'disconnected',
      },
    });
  }
});

// ─── App Fallback ─────────────────────────────────────────────
app.get('/', (req: Request, res: Response) => {
  res.send('Mobilize Express Backend API is active.');
});

// ─── Error Handler ────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Always log with stack trace
  console.error(`[Error] ${req.method} ${req.path} → ${status}: ${message}`);
  if (err.stack) console.error(err.stack);

  res.status(status).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  });
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(port, () => {
  console.log(`[Server]: Mobilize Express API listening at http://localhost:${port}`);
});

export default app;
