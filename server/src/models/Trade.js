import mongoose from 'mongoose';
import { pnl, risk, rMultiple } from '@tradelog/shared';

const tradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    symbol: { type: String, required: true, uppercase: true, trim: true, maxlength: 20 },
    side: { type: String, required: true, enum: ['Long', 'Short'] },
    setup: { type: String, required: true, trim: true, maxlength: 40 },
    entry: { type: Number, required: true },
    stop: { type: Number, required: true },
    exit: { type: Number, required: true },
    qty: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '', maxlength: 1000 }
  },
  { timestamps: true }
);

// Every query is scoped to one user and usually sorted by date.
tradeSchema.index({ user: 1, date: -1 });

// The API returns the computed numbers so clients never have to repeat the maths.
tradeSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const { _id, __v, user, ...rest } = ret;
    void __v; void user;
    return { id: String(_id), ...rest, pnl: pnl(ret), risk: risk(ret), r: rMultiple(ret) };
  }
});

export const Trade = mongoose.model('Trade', tradeSchema);
