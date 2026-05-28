import rateLimit from 'express-rate-limit';

/**
 * General rate limiter: 100 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter: 10 requests per minute per IP.
 * Prevents brute-force login attempts.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many auth attempts. Wait 1 minute before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Application rate limiter: 20 per minute per user.
 * Prevents automated bulk applications.
 */
export const applyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req: any) => req.user?.id || req.ip,
  message: { success: false, error: 'Too many applications submitted. Wait 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
