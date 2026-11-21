import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { tradesRouter } from './routes/trades.js';
import { notFound, errorHandler } from './middleware/errors.js';

/** Builds the Express app without connecting or listening, so tests can use it directly. */
export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
  });

  // Slow down password guessing.
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.isTest ? 1000 : 20, standardHeaders: 'draft-8', legacyHeaders: false });
  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/trades', tradesRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
