import { Router } from 'express';
import { sampleTrades } from '@tradelog/shared';
import { User } from '../models/User.js';
import { Trade } from '../models/Trade.js';
import { registerSchema, loginSchema } from '../schemas.js';
import { validate, HttpError } from '../middleware/errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password, withSampleData } = req.body;
  const user = await User.create({ name, email, passwordHash: await User.hashPassword(password) });
  if (withSampleData) {
    await Trade.insertMany(sampleTrades().map(({ id, ...t }) => (void id, { ...t, user: user._id })));
  }
  res.status(201).json({ token: signToken(user._id), user });
});

authRouter.post('/login', validate(loginSchema), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!user || !(await user.checkPassword(req.body.password))) throw new HttpError(401, 'Email or password is incorrect.');
  res.json({ token: signToken(user._id), user });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(401, 'Sign in to continue.');
  res.json({ user });
});
