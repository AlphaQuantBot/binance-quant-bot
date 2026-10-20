export const MARKET_MAX_AGE_MS = 30_000;
export interface MarketProvenance { source: 'BINANCE'; receivedAt: number; generated: false }
export function isFreshMarket(provenance: unknown, now = Date.now()): provenance is MarketProvenance {
  const p = provenance as MarketProvenance | null;
  return !!p && p.source === 'BINANCE' && p.generated === false && Number.isFinite(p.receivedAt)
    && p.receivedAt <= now + 1000 && now - p.receivedAt <= MARKET_MAX_AGE_MS;
}
export function canUseMarketPayload(payload: any, now = Date.now()) {
  return payload?.success === true && payload.synthetic !== true && payload.fallback !== true
    && Array.isArray(payload.data) && payload.data.length > 0 && isFreshMarket(payload.provenance, now);
}
