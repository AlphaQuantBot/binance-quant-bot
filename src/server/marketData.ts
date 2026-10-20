import { Router } from 'express';
import { MARKET_MAX_AGE_MS } from '../utils/marketProvenance';
import type { Ticker } from '../types/crypto';

export class LiveTickerFeed {
  private rows = new Map<string, { ticker: Ticker; receivedAt: number }>();
  update(tickers: Ticker[], receivedAt = Date.now()) {
    for (const ticker of tickers) {
      if (!/^[A-Z0-9]+USDT$/.test(ticker.symbol)) continue;
      if (![ticker.lastPrice, ticker.highPrice, ticker.lowPrice, ticker.priceChangePercent, ticker.volume, ticker.quoteVolume].every(x => x !== '' && Number.isFinite(Number(x)))) continue;
      if (Number(ticker.lastPrice) <= 0 || Number(ticker.lowPrice) <= 0 || Number(ticker.highPrice) < Number(ticker.lowPrice) || Number(ticker.volume) < 0 || Number(ticker.quoteVolume) < 0) continue;
      const previous = this.rows.get(ticker.symbol);
      if (!previous || previous.receivedAt <= receivedAt) this.rows.set(ticker.symbol, { ticker, receivedAt });
    }
  }
  snapshot(now = Date.now()) {
    const fresh = [...this.rows.values()].filter(row => row.receivedAt <= now + 1000 && now - row.receivedAt <= MARKET_MAX_AGE_MS);
    return { data: fresh.map(row => row.ticker), receivedAt: fresh.length ? Math.min(...fresh.map(row => row.receivedAt)) : null };
  }
}

export function createMarketDataRouter(feed: LiveTickerFeed, fetchKlines: (symbol: string, interval: string, limit: number) => Promise<unknown>, now = Date.now) {
  const router = Router();
  router.get('/ping', (_req, res) => {
    const snapshot = feed.snapshot(now());
    return res.json({ success: true, status: snapshot.data.length ? 'ONLINE' : 'OFFLINE', activePairsCount: snapshot.data.length, receivedAt: snapshot.receivedAt, gateway: 'BINANCE_MARKET_DATA', latencyMs: null });
  });
  router.get('/tickers', (_req, res) => {
    const snapshot = feed.snapshot(now());
    if (!snapshot.data.length) return res.status(503).json({ success: false, code: 'MARKET_DATA_UNAVAILABLE', data: [], provenance: null });
    return res.json({ success: true, count: snapshot.data.length, data: snapshot.data, provenance: { source: 'BINANCE', receivedAt: snapshot.receivedAt, generated: false } });
  });
  router.get('/klines', async (req, res) => {
    const symbol = String(req.query.symbol || 'BTCUSDT').toUpperCase();
    const interval = String(req.query.interval || '15m');
    const limit = Number(req.query.limit || '65');
    if (!/^[A-Z0-9]{3,24}$/.test(symbol) || !['1m', '5m', '15m', '1h', '4h', '1d'].includes(interval) || !Number.isInteger(limit) || limit < 1 || limit > 1000) return res.status(400).json({ success: false, code: 'INVALID_MARKET_QUERY', data: [] });
    try {
      const raw = await fetchKlines(symbol, interval, limit);
      if (!Array.isArray(raw) || !raw.length || raw.length > limit) throw new Error('Invalid klines');
      let previousTime = -1;
      const data = raw.map((row: any) => {
        if (!Array.isArray(row) || row.length < 6 || row.slice(0, 6).some((x: any) => x === null || x === '' || !Number.isFinite(Number(x)))) throw new Error('Invalid candle');
        const [time, open, high, low, close, volume] = row.slice(0, 6).map(Number);
        if (time <= previousTime || time > now() + 1000 || low <= 0 || volume < 0 || high < Math.max(open, close) || low > Math.min(open, close)) throw new Error('Invalid candle values');
        previousTime = time;
        return { time, open, high, low, close, volume };
      });
      const step = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 86400000 }[interval]!;
      if (now() - data[data.length - 1].time > step + MARKET_MAX_AGE_MS) throw new Error('Stale candles');
      return res.json({ success: true, symbol, interval, data, provenance: { source: 'BINANCE', receivedAt: now(), generated: false } });
    } catch { return res.status(503).json({ success: false, code: 'MARKET_DATA_UNAVAILABLE', symbol, interval, data: [], provenance: null }); }
  });
  return router;
}
