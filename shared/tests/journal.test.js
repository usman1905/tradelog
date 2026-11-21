import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pnl, risk, rMultiple, stats, byDate, sampleTrades, validateTrade } from '../src/journal.js';

const long = { id: 1, date: '2026-01-02', side: 'Long', entry: 100, stop: 95, exit: 110, qty: 2 };
const short = { id: 2, date: '2026-01-01', side: 'Short', entry: 50, stop: 52, exit: 53, qty: 10 };

test('profit and loss respects trade direction', () => {
  assert.equal(pnl(long), 20);
  assert.equal(pnl(short), -30);
});

test('risk is distance to stop times quantity', () => {
  assert.equal(risk(long), 10);
  assert.equal(risk(short), 20);
});

test('R-multiple is result divided by risk', () => {
  assert.equal(rMultiple(long), 2);
  assert.equal(rMultiple(short), -1.5);
  assert.equal(rMultiple({ ...long, stop: 100 }), 0, 'zero risk does not divide by zero');
});

test('stats summarise a set of trades', () => {
  const s = stats([long, short]);
  assert.equal(s.count, 2);
  assert.equal(s.net, -10);
  assert.equal(s.winRate, 0.5);
  assert.equal(s.avgR, 0.25);
  assert.ok(Math.abs(s.profitFactor - 20 / 30) < 1e-9);
  assert.equal(s.maxDrawdown, -30, 'short loss came first by date, so equity fell 30 from its start');
});

test('stats on no trades are all zero', () => {
  assert.deepEqual(stats([]), { count: 0, net: 0, winRate: 0, avgR: 0, profitFactor: 0, maxDrawdown: 0 });
});

test('byDate sorts oldest first without mutating input', () => {
  const input = [long, short];
  assert.deepEqual(byDate(input).map(t => t.id), [2, 1]);
  assert.deepEqual(input.map(t => t.id), [1, 2]);
});

test('sample data is deterministic and valid', () => {
  const a = sampleTrades(), b = sampleTrades();
  assert.equal(a.length, 46);
  assert.deepEqual(a.map(t => t.exit), b.map(t => t.exit));
  for (const t of a) assert.equal(validateTrade(t), '', `trade ${t.id} should be valid`);
});

test('validation catches impossible trades', () => {
  assert.match(validateTrade({ ...long, qty: 0 }), /Quantity/);
  assert.match(validateTrade({ ...long, stop: 100 }), /risk is zero/);
  assert.match(validateTrade({ ...long, stop: 105 }), /below entry/);
  assert.match(validateTrade({ ...short, stop: 49 }), /above entry/);
  assert.match(validateTrade({ ...long, entry: NaN }), /numbers/);
  assert.equal(validateTrade(long), '');
});

test('summary groups by setup and builds the equity curve', async () => {
  const { summary } = await import('../src/journal.js');
  const trades = [
    { id: 'b', date: '2026-01-02', side: 'Long', setup: 'Breakout', entry: 100, stop: 90, exit: 120, qty: 1 },
    { id: 'a', date: '2026-01-01', side: 'Short', setup: 'Pullback', entry: 50, stop: 55, exit: 60, qty: 2 }
  ];
  const s = summary(trades);
  assert.deepEqual(s.equity.map(p => p.equity), [-20, 0]);
  assert.equal(s.bySetup[0].setup, 'Breakout');
  assert.equal(s.bySetup[0].net, 20);
  assert.equal(s.stats.count, 2);
});
