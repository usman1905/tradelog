// Pure trade maths, shared by the app and the tests. No DOM access here.
/* ---------- trade maths ---------- */
export const dir = t => (t.side === 'Short' ? -1 : 1);
export const pnl = t => (t.exit - t.entry) * t.qty * dir(t);
export const risk = t => Math.abs(t.entry - t.stop) * t.qty;
export const rMultiple = t => (risk(t) > 0 ? pnl(t) / risk(t) : 0);

export function stats(trades) {
  const wins = trades.filter(t => pnl(t) > 0);
  const losses = trades.filter(t => pnl(t) <= 0);
  const gross = a => a.reduce((s, t) => s + pnl(t), 0);
  const grossWin = gross(wins), grossLoss = Math.abs(gross(losses));
  return {
    count: trades.length,
    net: gross(trades),
    winRate: trades.length ? wins.length / trades.length : 0,
    avgR: trades.length ? trades.reduce((s, t) => s + rMultiple(t), 0) / trades.length : 0,
    profitFactor: grossLoss ? grossWin / grossLoss : (grossWin ? Infinity : 0),
    maxDrawdown: maxDrawdown(trades)
  };
}

export function maxDrawdown(trades) {
  let peak = 0, eq = 0, dd = 0;
  for (const t of byDate(trades)) { eq += pnl(t); peak = Math.max(peak, eq); dd = Math.min(dd, eq - peak); }
  return dd;
}

export const byDate = a => [...a].sort((x, y) => x.date.localeCompare(y.date) || x.id - y.id);

/* ---------- sample data (seeded, so it looks the same every time) ---------- */
export function sampleTrades() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const symbols = [['BTCUSDT', 64000, 0.05], ['ETHUSDT', 3100, 0.8], ['SOLUSDT', 145, 18], ['BNBUSDT', 560, 4], ['XRPUSDT', 0.55, 4500]];
  const setups = ['Breakout', 'Pullback', 'Range fade', 'Trend continuation'];
  const edge = { 'Breakout': 0.5, 'Pullback': 0.54, 'Range fade': 0.36, 'Trend continuation': 0.47 };
  const notes = ['Clean retest of the level', 'Moved stop too early', 'Followed the plan', 'Entered late, chased the candle', 'Took partials at 1R', 'News spike, should have waited'];
  const out = [];
  const start = new Date(); start.setDate(start.getDate() - 120);
  for (let i = 0; i < 46; i++) {
    const [symbol, base, qty] = symbols[Math.floor(rnd() * symbols.length)];
    const setup = setups[Math.floor(rnd() * setups.length)];
    const side = rnd() > 0.35 ? 'Long' : 'Short';
    const entry = +(base * (0.9 + rnd() * 0.2)).toPrecision(5);
    const riskPct = 0.008 + rnd() * 0.012;
    const stop = +(entry * (1 - riskPct * (side === 'Long' ? 1 : -1))).toPrecision(5);
    const win = rnd() < edge[setup];
    const r = win ? 0.5 + rnd() * 2.3 : -(0.65 + rnd() * 0.4);
    const exit = +(entry + (entry - stop) * r).toPrecision(5);
    const d = new Date(start); d.setDate(d.getDate() + Math.floor(i * 120 / 46));
    out.push({ id: i + 1, date: d.toISOString().slice(0, 10), symbol, side, setup, entry, stop, exit, qty, notes: notes[Math.floor(rnd() * notes.length)] });
  }
  return out;
}

export function validateTrade(t) {
  if ([t.entry, t.stop, t.exit, t.qty].some(v => !isFinite(v))) return 'Enter numbers for entry, stop, exit and quantity.';
  if (t.qty <= 0) return 'Quantity must be more than zero.';
  if (t.entry === t.stop) return 'Stop loss must be different from entry, or the risk is zero.';
  if (t.side === 'Long' && t.stop > t.entry) return 'For a long trade the stop goes below entry.';
  if (t.side === 'Short' && t.stop < t.entry) return 'For a short trade the stop goes above entry.';
  return '';
}
