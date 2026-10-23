# PancakeSwap observation revision

This branch converts the runnable application to a read-only research terminal.
It starts from the AI Studio import; the imported root-level legacy components remain for reference but are not imported by the new entry point. The server no longer registers legacy trading, wallet, credential, approval, buyback, burn, fake-audit or position-closing endpoints.

## Implemented in this first revision
- Consistent HTML -> observation React entry -> observation-only API.
- Contract-address lookup and symbol search for indexed BSC/PancakeSwap pools.
- Provider price, liquidity, volume, transaction counts, change and pool identity, with source links.
- Retrieval timestamps, explicit unknown provider event age, cached retrieval identity and visible stale/failure states. No fabricated fallback values.
- Local watchlist and alert rules (maximum 40 each). Alarms evaluate only tokens in the current open research query. They do not monitor all watchlist tokens in the background.
- In-tab alert events and last 500 session observations. They are not historical candles, trades, or a durable server journal.
- Deterministic data summary, clearly not AI analysis or a contract audit.
- Security fields remain UNKNOWN. No listing probabilities, guaranteed returns, fabricated transactions or safe-token verdicts.

## Not yet implemented
This is not completion of the entire observation product. Automatic new-pool discovery, whale/event ingestion, holder concentration, independently sourced contract risk checks, evidence-grounded AI/news summaries, durable history, background monitoring and external alert delivery need separate source integrations and validation.

DEX Screener search results are a provider-indexed subset, not an exhaustive list of PancakeSwap pools. Prices refer to each returned pool's base token. Token addresses must be checked; a symbol is not an identity.
API reference: https://docs.dexscreener.com/api/reference
Public API retrieval does not establish security, liquidity lock or sellability.

## Run and verify
Node 24 recommended. npm install, npm run lint, npm run test:observation, npm run build, npm run dev.
Production: NODE_ENV=production npm start. The server binds to 127.0.0.1. No API key or wallet is required.
The checked-in old PWA/service worker is not registered by this revision; existing installations may still require clearing old site/service-worker data during migration.

## Validation limits
Unit/integration tests use fixtures and a local HTTP server. They do not prove the upstream provider is currently reachable or complete.
CI runs lint, observation tests and production build. Browser interaction and real provider availability require a separate smoke test.
