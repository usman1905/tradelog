import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startDb, stopDb, clearDb, makeApp, signUp, sampleTrade } from './helpers.js';

let app;
before(async () => { await startDb(); app = await makeApp(); });
beforeEach(clearDb);
after(stopDb);

test('trades need a signed-in user', async () => {
  await request(app).get('/api/trades').expect(401);
  await request(app).post('/api/trades').send(sampleTrade()).expect(401);
});

test('create, read, update and delete a trade', async () => {
  const { auth } = await signUp(app);
  const created = await request(app).post('/api/trades').set(auth).send(sampleTrade()).expect(201);
  const t = created.body.trade;
  assert.equal(t.symbol, 'BTCUSDT', 'symbol is upper-cased');
  assert.equal(t.pnl, 20);
  assert.equal(t.r, 2);
  assert.equal(t.user, undefined, 'owner id is not exposed');

  const got = await request(app).get(`/api/trades/${t.id}`).set(auth).expect(200);
  assert.equal(got.body.trade.id, t.id);

  const updated = await request(app).put(`/api/trades/${t.id}`).set(auth).send(sampleTrade({ exit: 90 })).expect(200);
  assert.equal(updated.body.trade.pnl, -20);

  await request(app).delete(`/api/trades/${t.id}`).set(auth).expect(204);
  await request(app).get(`/api/trades/${t.id}`).set(auth).expect(404);
});

test('invalid trades are rejected with a clear message', async () => {
  const { auth } = await signUp(app);
  const wrongStop = await request(app).post('/api/trades').set(auth).send(sampleTrade({ stop: 105 })).expect(400);
  assert.match(wrongStop.body.error, /stop goes below entry/);
  const noQty = await request(app).post('/api/trades').set(auth).send(sampleTrade({ qty: 0 })).expect(400);
  assert.match(noQty.body.error, /more than zero/);
  await request(app).get('/api/trades/not-an-id').set(auth).expect(404);
});

test('users only ever see their own trades', async () => {
  const alice = await signUp(app);
  const bob = await signUp(app);
  const t = (await request(app).post('/api/trades').set(alice.auth).send(sampleTrade())).body.trade;

  await request(app).get(`/api/trades/${t.id}`).set(bob.auth).expect(404);
  await request(app).put(`/api/trades/${t.id}`).set(bob.auth).send(sampleTrade()).expect(404);
  await request(app).delete(`/api/trades/${t.id}`).set(bob.auth).expect(404);
  const list = await request(app).get('/api/trades').set(bob.auth).expect(200);
  assert.equal(list.body.total, 0);
});

test('list supports date range, side, search and result filters', async () => {
  const { auth } = await signUp(app);
  const add = over => request(app).post('/api/trades').set(auth).send(sampleTrade(over)).expect(201);
  await add({ date: '2026-10-01', symbol: 'ETHUSDT', exit: 110 });
  await add({ date: '2026-11-01', side: 'Short', stop: 105, exit: 90, setup: 'Range fade' });
  await add({ date: '2026-11-15', exit: 96, notes: 'Moved stop too early' });

  const get = async q => (await request(app).get('/api/trades').query(q).set(auth).expect(200)).body;
  assert.equal((await get({})).total, 3);
  assert.deepEqual((await get({})).trades.map(t => t.date), ['2026-11-15', '2026-11-01', '2026-10-01'], 'newest first');
  assert.equal((await get({ from: '2026-11-01' })).total, 2);
  assert.equal((await get({ side: 'Short' })).total, 1);
  assert.equal((await get({ q: 'eth' })).total, 1);
  assert.equal((await get({ q: 'stop too' })).total, 1);
  assert.equal((await get({ result: 'loss' })).total, 1);
  assert.equal((await get({ limit: 2, page: 2 })).trades.length, 1);
  await request(app).get('/api/trades').query({ side: 'Sideways' }).set(auth).expect(400);
});

test('summary returns stats, setups and the equity curve', async () => {
  const { auth } = await signUp(app);
  await request(app).post('/api/trades').set(auth).send(sampleTrade({ date: '2026-11-01' })).expect(201);
  await request(app).post('/api/trades').set(auth).send(sampleTrade({ date: '2026-11-02', exit: 95, setup: 'Pullback' })).expect(201);

  const s = (await request(app).get('/api/trades/summary').set(auth).expect(200)).body;
  assert.equal(s.stats.count, 2);
  assert.equal(s.stats.net, 10);
  assert.equal(s.stats.winRate, 0.5);
  assert.deepEqual(s.equity.map(p => p.equity), [20, 10]);
  assert.deepEqual(s.bySetup.map(x => x.setup), ['Breakout', 'Pullback']);
});

test('new accounts can start with sample data, and export as CSV', async () => {
  const { auth } = await signUp(app, { withSampleData: true });
  const list = await request(app).get('/api/trades').set(auth).expect(200);
  assert.equal(list.body.total, 46);
  const csv = await request(app).get('/api/trades/export.csv').set(auth).expect(200);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.equal(csv.text.split('\n').length, 47);
});
