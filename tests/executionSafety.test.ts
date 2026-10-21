import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import express from 'express';
import { liveExecutionGuard, exchangeCooldownResponse } from '../src/server/executionSafety';

const paths = ['/api/binance/order', '/api/binance/close-spot-position', '/api/binance/create-bnb-budget'];

test('all live mutation routes fail closed, without reaching exchange or changing balances', async () => {
  const app = express();
  let submissions = 0;
  const state = { cash: 100, quantity: 2, pnl: 0 };
  const before = { ...state };
  app.post(paths, liveExecutionGuard);
  app.post(paths, (_req, res) => {
    submissions++;
    state.cash = 0;
    state.quantity = 0;
    state.pnl = 99;
    res.json({ success: true, status: 'FILLED' });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    for (const path of paths) {
      const response: globalThis.Response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method: 'POST' });
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.success, false);
      assert.equal(body.executionState, 'NOT_SUBMITTED');
      assert.equal(body.code, 'LIVE_EXECUTION_PAUSED');
      assert.equal(body.orderId, undefined);
      assert.equal(body.status, undefined);
    }
    assert.equal(submissions, 0);
    assert.deepEqual(state, before);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
});

test('cooldown produces rejection, not a simulated exchange fill', () => {
  const result = exchangeCooldownResponse(3001, 1000);
  assert.equal(result.success, false);
  assert.equal(result.retryAfterSeconds, 3);
  assert.equal(result.executionState, 'NOT_SUBMITTED');
  assert.ok(!('orderId' in result));
  assert.ok(!('status' in result));
});

test('production route guard precedes all live handlers; bot state mutation is gated', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  const guard = server.indexOf('], liveExecutionGuard)');
  assert.ok(guard > 0);
  for (const path of paths) assert.equal(server.includes(`app.post('${path}'`), false);
  assert.equal(server.includes("method: 'POST'"), false, 'legacy exchange mutations removed');
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const cycle = app.slice(app.indexOf('const executeBotCycle = useCallback'));
  assert.ok(cycle.indexOf('if (isLive || !isFreshMarket(tickerProvenanceRef.current)) return;') < cycle.indexOf('setBots('));
  assert.ok(cycle.indexOf('if (isLive || !isFreshMarket(tickerProvenanceRef.current)) return;') < cycle.indexOf('setSettings('));
});
