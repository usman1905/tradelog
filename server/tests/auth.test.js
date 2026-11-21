import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startDb, stopDb, clearDb, makeApp, signUp } from './helpers.js';

let app;
before(async () => { await startDb(); app = await makeApp(); });
beforeEach(clearDb);
after(stopDb);

test('health check reports the database as up', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.deepEqual(res.body, { status: 'ok', db: 'up' });
});

test('register returns a token and never the password hash', async () => {
  const { res } = await signUp(app);
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.name, 'Test Trader');
  assert.equal(res.body.user.passwordHash, undefined);
});

test('register rejects a short password and a bad email', async () => {
  const short = await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@example.com', password: '123' });
  assert.equal(short.status, 400);
  assert.match(short.body.error, /8 characters/);
  const bad = await request(app).post('/api/auth/register').send({ name: 'A', email: 'not-an-email', password: 'long-enough' });
  assert.equal(bad.status, 400);
});

test('the same email cannot register twice', async () => {
  const { email } = await signUp(app);
  const res = await request(app).post('/api/auth/register').send({ name: 'B', email: email.toUpperCase(), password: 'another-pass' });
  assert.equal(res.status, 409);
});

test('login works with the right password and fails with the wrong one', async () => {
  const { email } = await signUp(app);
  const ok = await request(app).post('/api/auth/login').send({ email, password: 'correct-horse' }).expect(200);
  assert.ok(ok.body.token);
  const wrong = await request(app).post('/api/auth/login').send({ email, password: 'wrong-horse' });
  assert.equal(wrong.status, 401);
  const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-horse' });
  assert.equal(unknown.body.error, wrong.body.error, 'same message, so emails cannot be probed');
});

test('/me needs a valid token', async () => {
  const { auth, email } = await signUp(app);
  const me = await request(app).get('/api/auth/me').set(auth).expect(200);
  assert.equal(me.body.user.email, email);
  await request(app).get('/api/auth/me').expect(401);
  await request(app).get('/api/auth/me').set({ Authorization: 'Bearer nonsense' }).expect(401);
});

test('unknown routes return JSON 404', async () => {
  const res = await request(app).get('/api/nope').expect(404);
  assert.match(res.body.error, /No route/);
});
