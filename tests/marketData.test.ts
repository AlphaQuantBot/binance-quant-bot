import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { readFileSync } from 'node:fs';
import { LiveTickerFeed, createMarketDataRouter } from '../src/server/marketData';
import { canUseMarketPayload, isFreshMarket } from '../src/utils/marketProvenance';

const ticker = { symbol: 'BTCUSDT', lastPrice: '100', highPrice: '110', lowPrice: '90', priceChangePercent: '2', volume: '1000', quoteVolume: '100000' };

test('feed does not seed examples; stale symbols expire individually and older updates cannot overwrite', () => {
  const feed = new LiveTickerFeed(); assert.deepEqual(feed.snapshot(1000).data, []);
  feed.update([ticker], 1000); feed.update([{ ...ticker, lastPrice: '99' }], 500);
  assert.equal(feed.snapshot(1001).data[0].lastPrice, '100');
  feed.update([{ ...ticker, symbol: 'ETHUSDT' }], 20000);
  assert.deepEqual(feed.snapshot(32000).data.map(x => x.symbol), ['ETHUSDT']);
  assert.deepEqual(feed.snapshot(60000).data, []);
  feed.update([{ ...ticker, lastPrice: 'not-a-price' }], 60000);
  assert.deepEqual(feed.snapshot(60000).data, []);
});

test('frontend rejects missing provenance, demo, fallback, future and stale responses', () => {
  const provenance = { source: 'BINANCE', receivedAt: 1000, generated: false };
  assert.equal(isFreshMarket(provenance, 1001), true);
  assert.equal(isFreshMarket(provenance, 32000), false);
  assert.equal(isFreshMarket({ ...provenance, receivedAt: 50000 }, 1001), false);
  const valid = { success: true, data: [ticker], provenance };
  assert.equal(canUseMarketPayload(valid, 1001), true);
  for (const invalid of [{ ...valid, synthetic: true }, { ...valid, fallback: true }, { ...valid, data: [] }, { ...valid, provenance: null }, { ...valid, provenance: { ...provenance, source: 'DEMO' } }, { ...valid, provenance: { ...provenance, generated: true } }]) assert.equal(canUseMarketPayload(invalid, 1001), false);
});

test('market HTTP failures return no candles; valid upstream data has explicit provenance', async () => {
  let now = 100000000; let calls = 0; let mode = 'error';
  const feed = new LiveTickerFeed(); const app = express();
  app.use(createMarketDataRouter(feed, async () => {
    calls++;
    if (mode === 'error') throw new Error('offline');
    if (mode === 'malformed') return [[now - 1000, 'NaN', 2, 1, 1, 1]];
    if (mode === 'stale') return [[now - 1000000, 100, 110, 90, 101, 20]];
    return [[now - 1000, 100, 110, 90, 101, 20]];
  }, () => now));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`;
    assert.equal((await fetch(base + '/tickers')).status, 503);
    assert.equal((await (await fetch(base + '/ping')).json()).status, 'OFFLINE');
    feed.update([ticker], now); assert.equal((await (await fetch(base + '/ping')).json()).status, 'ONLINE'); const ticks = await (await fetch(base + '/tickers')).json(); assert.equal(canUseMarketPayload(ticks, now), true);
    const invalid = await fetch(base + '/klines?limit=-1'); assert.equal(invalid.status, 400); assert.equal(calls, 0);
    for (const value of ['error', 'malformed', 'stale']) {
      mode = value; const response = await fetch(base + '/klines?interval=1m'); assert.equal(response.status, 503);
      const body = await response.json(); assert.equal(body.success, false); assert.deepEqual(body.data, []); assert.equal(body.provenance, null);
    }
    mode = 'live'; const live = await (await fetch(base + '/klines?interval=1m')).json();
    assert.equal(canUseMarketPayload(live, now), true); assert.equal(live.symbol, 'BTCUSDT'); assert.equal(live.data[0].close, 101);
    now += 31000; assert.equal((await fetch(base + '/tickers')).status, 503);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test('integration removes fabricated market/model/balance fallbacks and gates automatic cycles', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  for (const oldName of ['defaultAlphaFallback', 'fallbackTickers', 'fallbackHoldings', 'synthetic: true']) assert.ok(!server.includes(oldName), oldName);
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.ok(app.includes("if (isLive || !isFreshMarket(tickerProvenanceRef.current)) return;"));
  assert.ok(app.includes("currentBots.filter(b => b.status === 'RUNNING'"));
  assert.ok(app.includes('if (requestId !== candleRequestRef.current) return;'));
  assert.ok(app.includes('setCandles([])'));
});
