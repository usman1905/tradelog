import { z } from 'zod';
import { validateTrade } from '@tradelog/shared';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80),
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(128),
  withSampleData: z.boolean().optional()
});

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password.')
});

const tradeFields = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-11-19.'),
  symbol: z.string().trim().min(1, 'Enter a symbol.').max(20).transform(s => s.toUpperCase()),
  side: z.enum(['Long', 'Short']),
  setup: z.string().trim().min(1, 'Enter a setup.').max(40),
  entry: z.number().finite(),
  stop: z.number().finite(),
  exit: z.number().finite(),
  qty: z.number().finite().positive('Quantity must be more than zero.'),
  notes: z.string().max(1000).optional().default('')
};

// Same rules as the client form, so both sides reject the same trades.
const tradeRules = (t, ctx) => {
  const message = validateTrade(t);
  if (message) ctx.addIssue({ code: 'custom', message, path: ['stop'] });
};

export const tradeSchema = z.object(tradeFields).superRefine(tradeRules);

export const tradeQuerySchema = z.object({
  from: tradeFields.date.optional(),
  to: tradeFields.date.optional(),
  side: z.enum(['Long', 'Short']).optional(),
  result: z.enum(['win', 'loss']).optional(),
  q: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  page: z.coerce.number().int().min(1).default(1)
});
