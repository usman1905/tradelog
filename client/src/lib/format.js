export const money = v => (v < 0 ? '−$' : '$') + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const signedMoney = v => (v > 0 ? '+' : '') + money(v);
export const fmtR = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + 'R';
export const tone = v => (v > 0 ? 'up' : v < 0 ? 'down' : '');
export const pct = v => (v * 100).toFixed(0) + '%';
export const today = () => new Date().toISOString().slice(0, 10);

/** First date to include for a range like "30" days, or undefined for all time. */
export function fromDate(range, now = new Date()) {
  if (range === 'all') return undefined;
  const d = new Date(now);
  d.setDate(d.getDate() - Number(range));
  return d.toISOString().slice(0, 10);
}
