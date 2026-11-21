import { describe, it, expect, beforeEach } from 'vitest';
import { demoApi } from '../src/api/demo.js';

describe('demo API', () => {
  beforeEach(() => demoApi.reset());

  it('starts with sample trades and computed numbers', async () => {
    const { trades, total } = await demoApi.listTrades();
    expect(total).toBe(46);
    expect(trades[0]).toHaveProperty('pnl');
    expect(trades[0].date >= trades[1].date).toBe(true);
  });

  it('creates, updates and deletes trades and keeps them in storage', async () => {
    const t = await demoApi.createTrade({ date: '2026-11-19', symbol: 'ethusdt', side: 'Long', setup: 'Breakout', entry: 100, stop: 95, exit: 110, qty: 2, notes: '' });
    expect(t.symbol).toBe('ETHUSDT');
    expect(t.r).toBe(2);
    expect(JSON.parse(localStorage.getItem('tradelog.demo.trades')).length).toBe(47);
    const u = await demoApi.updateTrade(t.id, { ...t, exit: 90 });
    expect(u.pnl).toBe(-20);
    await demoApi.deleteTrade(t.id);
    expect((await demoApi.listTrades()).total).toBe(46);
  });

  it('rejects the same invalid trades as the API', async () => {
    await expect(demoApi.createTrade({ date: '2026-11-19', symbol: 'X', side: 'Long', setup: 'A', entry: 100, stop: 105, exit: 110, qty: 1 }))
      .rejects.toThrow(/stop goes below entry/);
  });

  it('filters and summarises', async () => {
    const shorts = await demoApi.listTrades({ side: 'Short' });
    expect(shorts.trades.every(t => t.side === 'Short')).toBe(true);
    const s = await demoApi.summary({});
    expect(s.stats.count).toBe(46);
    expect(s.equity).toHaveLength(46);
  });
});
