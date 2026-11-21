// Test database: uses MONGODB_URI_TEST when set (CI runs a MongoDB service),
// otherwise starts a throwaway in-memory MongoDB.
process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import request from 'supertest';

let memory;

export async function startDb() {
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memory = await MongoMemoryServer.create();
    uri = memory.getUri();
  }
  await mongoose.connect(uri, { dbName: `tradelog_test_${process.pid}` });
}

export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map(c => c.deleteMany({})));
}

export async function stopDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (memory) await memory.stop();
}

export async function makeApp() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

let n = 0;
/** Registers a fresh user and returns an agent-like helper with the token set. */
export async function signUp(app, extra = {}) {
  const email = `trader${++n}@example.com`;
  const res = await request(app).post('/api/auth/register').send({ name: 'Test Trader', email, password: 'correct-horse', ...extra });
  const auth = { Authorization: `Bearer ${res.body.token}` };
  return { res, email, auth };
}

export const sampleTrade = (over = {}) => ({
  date: '2026-11-03', symbol: 'btcusdt', side: 'Long', setup: 'Breakout',
  entry: 100, stop: 95, exit: 110, qty: 2, notes: 'Clean retest', ...over
});
