import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware factory: validates req.body against a Zod schema.
 * Returns 400 with structured error details on validation failure.
 */
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }
    req.body = result.data;
    next();
  };
}

// ─────────────────────────────────────────────────────────
// Common Zod Schemas
// ─────────────────────────────────────────────────────────

export const schemas = {
  /** POST /api/applications/apply */
  applyToCampaign: z.object({
    campaign_id: z.string().uuid('Invalid campaign ID'),
  }),

  /** POST /api/campaigns (create) */
  createCampaign: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    category: z.enum([
      'political_event', 'wedding_social', 'brand_activation',
      'religious_gathering', 'ngo_volunteer', 'influencer_shoot',
      'survey_research', 'entertainment',
    ]),
    description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
    slots_total: z.number().int().min(1).max(100000),
    payout: z.number().min(50, 'Minimum payout is ₹50').max(50000),
    event_date: z.string().min(1, 'Event date is required'),
    location_name: z.string().min(2, 'Location name is required'),
    location_lat: z.number().optional(),
    location_lng: z.number().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    requirements: z.object({
      min_age: z.number().int().min(14).max(100).optional(),
      max_age: z.number().int().min(14).max(100).optional(),
      gender: z.enum(['any', 'male', 'female']).optional(),
      min_reliability_score: z.number().min(0).max(100).optional(),
      languages: z.array(z.string()).optional(),
    }).optional(),
  }),

  /** PATCH /api/admin/users/:id/ban */
  banUser: z.object({
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
    duration_days: z.number().int().positive().nullable().optional(),
    notify: z.boolean().optional(),
  }),

  /** POST /api/wallet/create-order */
  createWalletOrder: z.object({
    amount: z.number().min(500, 'Minimum top-up is ₹500'),
  }),

  /** POST /api/wallet/verify-payment */
  verifyPayment: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),

  /** POST /api/checkin */
  checkIn: z.object({
    campaign_id: z.string().uuid('Invalid campaign ID'),
    latitude: z.number(),
    longitude: z.number(),
    selfie_url: z.string().optional(),
  }),
};
