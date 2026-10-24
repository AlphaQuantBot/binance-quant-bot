# Official listing watch — separate optional module

This feature is separate from the Toplu Gozlem parameter consolidation. It adds public-source queries only when its endpoint or CLI is explicitly invoked. It does not replace existing sources, alter trading behavior or create orders.

## Sources supported now
- KuCoin public announcements: https://www.kucoin.com/docs-new/rest/spot-trading/market-data/get-announcements
- KuCoin public currency details: https://www.kucoin.com/docs-new/rest/spot-trading/market-data/get-currency
- Bybit public announcements: https://bybit-exchange.github.io/docs/v5/announcement
- DEX Screener indexed token pools: https://docs.dexscreener.com/api/reference

Binance, MEXC, Gate, Bitget, LBank and BitMart are explicitly NOT automated in this version.
Two exchanges do not mean complete market coverage. The first page of 20 records from each feed is examined; details are bounded to the newest eight spot candidates. Results have coverage metadata, and an empty limited result is never a universal "no listings" finding.

## Evidence rules
- Spot, derivatives/pre-market, new-pair notices and postponement/delisting updates remain separate.
- An announcement timestamp or activity timestamp is never used as the trading opening time.
- Only explicit supported full-year UTC trading lines are parsed. Unsupported date formats remain unknown.
- HTML contract extraction is limited to an article element and BscScan token links. Unscoped HTML is not treated as token-identity proof.
- KuCoin's same-currency BSC chain contract is an additional exchange source; conflicting identities stop matching.
- Only the exact address as base token of an indexed bsc/pancakeswap pool qualifies. Symbol matches and other-chain pools are excluded.
- Provider index matches are not direct chain audits, sellability tests or security approvals.
- A future opening within seven days, a spot classification, one exchange-sourced BSC identity and an exact pool match are all required for UPCOMING_WITH_POOL.
- Revisions to schedules are not exhaustively reconciled. Separate update notices remain visible; the original source must be rechecked before relying on a schedule.

## Run
Node 24:
```sh
node scripts/read_listing_watch.mjs --summary
node --test tests/listingWatch.test.mjs
```
GET /api/pancakeswap/listing-watch is registered in server.ts.
The endpoint refuses other methods and accepts no user-supplied URLs.
No API key, wallet or private account data is read by this collector.
A snapshot is cached for 120 seconds. Concurrent readers share one run. Failures remain UNAVAILABLE/PARTIAL; sample results are never inserted.
Public requests are GET-only, redirect-disabled, timeout-limited and size-limited. A run has two workers and a request budget. No background daemon is installed.

## AI Studio integration
The repo remains a flattened import. Do not copy the entire repository into the working app.
Place listingWatch.mjs and listingWatchRoute.mjs next to the working server.ts.
Apply only the import and installOfficialListingWatch(app) registration shown in this PR's server.ts diff.
Place OfficialListingWatch.tsx under src/components.
In the existing PancakeDEXAutomation component add:
```tsx
import {OfficialListingWatch} from './OfficialListingWatch';
// Inside JSX, directly after the existing Toplu Gozlem summary:
<OfficialListingWatch />
```
This separate panel scans on button click only. It is not mounted automatically in the flattened repository; no App.tsx/index.html change is made.
Verify the original application lint/build and compare network requests before deployment.

## Validation limits
Tests use mock official-feed, article, currency and pool responses. They verify evidence boundaries and failure states, not the availability or completeness of live sources.
CI also runs an explicitly non-gating public-source smoke probe; a blocked or empty source is recorded, never converted to a successful match.
This PR is not deployed and does not assert that any particular real token currently meets the criteria.
