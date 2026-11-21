import { Router } from 'express';
import { pnl, rMultiple, summary } from '@tradelog/shared';
import { Trade } from '../models/Trade.js';
import { tradeSchema, tradeQuerySchema } from '../schemas.js';
import { validate, HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const tradesRouter = Router();
tradesRouter.use(requireAuth);

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds the MongoDB filter for the signed-in user from validated query params. */
function filterFor(userId, { from, to, side, q }) {
  const filter = { user: userId };
  if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  if (side) filter.side = side;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ symbol: rx }, { setup: rx }, { notes: rx }];
  }
  return filter;
}

// Win/loss depends on computed P&L, so it is applied after the query.
const byResult = result => t => !result || (result === 'win' ? pnl(t) > 0 : pnl(t) <= 0);

tradesRouter.get('/', validate(tradeQuerySchema, 'query'), async (req, res) => {
  const { limit, page, result } = req.validQuery;
  const docs = await Trade.find(filterFor(req.userId, req.validQuery)).sort({ date: -1, createdAt: -1 });
  const all = docs.filter(byResult(result));
  const start = (page - 1) * limit;
  res.json({ trades: all.slice(start, start + limit), total: all.length, page, limit });
});

tradesRouter.get('/summary', validate(tradeQuerySchema, 'query'), async (req, res) => {
  const docs = await Trade.find(filterFor(req.userId, req.validQuery)).lean();
  const trades = docs.map(d => ({ ...d, id: String(d._id) }));
  res.json(summary(trades));
});

tradesRouter.get('/export.csv', async (req, res) => {
  const docs = await Trade.find({ user: req.userId }).sort({ date: 1 }).lean();
  const quote = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = 'date,symbol,side,setup,entry,stop,exit,qty,pnl,r,notes';
  const rows = docs.map(t => [t.date, t.symbol, t.side, quote(t.setup), t.entry, t.stop, t.exit, t.qty, pnl(t).toFixed(2), rMultiple(t).toFixed(2), quote(t.notes)].join(','));
  res.type('text/csv').attachment('tradelog.csv').send([head, ...rows].join('\n'));
});

tradesRouter.post('/', validate(tradeSchema), async (req, res) => {
  const trade = await Trade.create({ ...req.body, user: req.userId });
  res.status(201).json({ trade });
});

tradesRouter.get('/:id', async (req, res) => {
  const trade = await Trade.findOne({ _id: req.params.id, user: req.userId });
  if (!trade) throw new HttpError(404, 'Trade not found.');
  res.json({ trade });
});

tradesRouter.put('/:id', validate(tradeSchema), async (req, res) => {
  const trade = await Trade.findOneAndUpdate({ _id: req.params.id, user: req.userId }, req.body, { returnDocument: 'after', runValidators: true });
  if (!trade) throw new HttpError(404, 'Trade not found.');
  res.json({ trade });
});

tradesRouter.delete('/:id', async (req, res) => {
  const trade = await Trade.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!trade) throw new HttpError(404, 'Trade not found.');
  res.status(204).end();
});
