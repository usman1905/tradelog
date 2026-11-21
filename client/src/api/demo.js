// Same interface as the HTTP client, backed by localStorage.
// Used for the public demo, where no API server is configured.
import { pnl, risk, rMultiple, byDate, summary, sampleTrades, validateTrade } from '@tradelog/shared';

const KEY = 'tradelog.demo.trades';
const DEMO_USER = { id: 'demo', name: 'Demo trader', email: 'demo@tradelog.app' };

const withMaths = t => ({ ...t, pnl: pnl(t), risk: risk(t), r: rMultiple(t) });

function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch { /* fall through */ }
  return sampleTrades();
}
function save(trades) {
  try { localStorage.setItem(KEY, JSON.stringify(trades)); } catch { /* private mode: keep in memory */ }
}

let trades = load();

function filtered({ from, to, side, q, result } = {}) {
  const needle = (q || '').trim().toLowerCase();
  return byDate(trades).reverse().filter(t =>
    (!from || t.date >= from) && (!to || t.date <= to) && (!side || t.side === side) &&
    (!needle || [t.symbol, t.setup, t.notes].join(' ').toLowerCase().includes(needle)) &&
    (!result || (result === 'win' ? pnl(t) > 0 : pnl(t) <= 0)));
}

function clean(input) {
  const t = { ...input, symbol: String(input.symbol || '').trim().toUpperCase(), setup: String(input.setup || '').trim(), notes: input.notes || '' };
  const error = validateTrade(t) || (!t.symbol && 'Enter a symbol.') || (!t.setup && 'Enter a setup.');
  if (error) throw Object.assign(new Error(error), { status: 400 });
  return t;
}

export const demoApi = {
  mode: 'demo',
  me: async () => DEMO_USER,
  login: async () => DEMO_USER,
  register: async () => DEMO_USER,
  logout: async () => {},
  async listTrades({ limit = 200, page = 1, ...query } = {}) {
    const all = filtered(query);
    return { trades: all.slice((page - 1) * limit, page * limit).map(withMaths), total: all.length, page, limit };
  },
  summary: async query => summary(filtered(query)),
  async createTrade(input) {
    const t = { ...clean(input), id: Math.max(0, ...trades.map(x => x.id)) + 1 };
    trades = [...trades, t]; save(trades);
    return withMaths(t);
  },
  async updateTrade(id, input) {
    const t = { ...clean(input), id };
    if (!trades.some(x => x.id === id)) throw Object.assign(new Error('Trade not found.'), { status: 404 });
    trades = trades.map(x => (x.id === id ? t : x)); save(trades);
    return withMaths(t);
  },
  async deleteTrade(id) { trades = trades.filter(t => t.id !== id); save(trades); return null; },
  async exportCsv() {
    const quote = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = byDate(trades).map(t => [t.date, t.symbol, t.side, quote(t.setup), t.entry, t.stop, t.exit, t.qty, pnl(t).toFixed(2), rMultiple(t).toFixed(2), quote(t.notes)].join(','));
    return new Blob(['date,symbol,side,setup,entry,stop,exit,qty,pnl,r,notes\n' + rows.join('\n')], { type: 'text/csv' });
  },
  async reset() { trades = sampleTrades(); save(trades); }
};
