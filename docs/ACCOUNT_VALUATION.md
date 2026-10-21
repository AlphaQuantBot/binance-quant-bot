# Read-only current account valuation

`npm run testnet:valuation` uses the independent APP_TESTNET_API_KEY and
APP_TESTNET_SECRET_KEY. It reads a consistent account snapshot, fetches
a bulk exchangeInfo market catalogue and a bulk bookTicker snapshot for nonzero
assets on their direct asset/USDT or inverse USDT/asset markets, and reads
the account again. The CLI receives read capabilities only, without submit/cancel.

Free plus locked balances are marked exactly at the direct bid or inverse ask. USDT is the unit
of account with price one; no other stablecoin is assumed pegged. Other assets
require a tradable Spot Testnet USDT market with fresh verified book data.
Direct asset/USDT conversion uses bid; inverse USDT/asset conversion buys USDT
at ask. Multi-hop conversion and unsupported markets remain unpriced, never zero.
Zero holdings need no price query. The actual adapter now uses exactly two public
GETs for batch market/quote collection, with bounded arrays of at most 10,000
markets/quotes. It validates market identities, tradable Spot metadata, positive
bid/ask quantities and non-crossed prices. Unicode asset identities are preserved
for reading; execution symbol policies are unchanged. Missing/invalid quotes
leave holdings unpriced. Fixtures/readers lacking batch support retain the old
20-market sequential budget; larger accounts produce an incomplete report
without issuing per-asset requests. A batch failure does not fan out or retry.
This read-only quote path provides no order-filter, fee or daily-risk evidence.

Every quote must still meet existing two-second book freshness at the final
account read. A ten-second total audit budget and unchanged balances, open orders
and account trading flag are required. Exact decimal products round down at 18
places. A single unpriced/stale asset or changing account makes
`currentEquityUSDT:null` and the CLI exits nonzero. Per-asset diagnostics remain
available, but a partial sum is never presented as whole-account equity.

These are book-price marks, not guaranteed liquidation proceeds: depth, slippage,
liquidation fees and executable lot sizes are not modelled. Bulk bookTicker
provides no exchange event time; freshness measures local request/receipt age,
not guaranteed exchange-side event age. Sequential REST reads
are not atomic; changes between identical observations cannot be ruled out. The
balance digest binds the final snapshot but is not a signature or persistent risk
attestation. No saved old valuation authorizes future orders.

`dailyRiskAuthorized:false` is always explicit. This module does not manufacture
an opening equity, assume zero transfers, reconstruct a whole day from known bot
orders or create a DailyRiskEvidence provider. Midnight baseline, complete
account-history/flow coverage and recovery of observation gaps remain outstanding.
It is a current valuation component for that future producer, not a complete daily
PnL/risk implementation. Actual configured testnet validation has not been run;
fixtures test exact math, freshness and failure cases without real credentials.


## Operator follow-up

Actual Windows preflight and account reconciliation passed after a13fc51:
account ready=true, no discrepancies and no open orders. The account contains
hundreds of distributed test assets, which the old valuation rejected at its
20-asset ceiling. Bulk valuation is now wired into valuation, equity/activity
observation and monitor commands. The valuation CLI prints a compact summary,
counts, unpriced names and issues, without dumping every balance. No partial
account equity is exposed. Markets unavailable in USDT remain an explicit blocker
to full-account valuation, not a reason to exclude test holdings or assume zero.
Local validation: 225 tests, TypeScript and production build passed. Actual
operator valuation must still be run with `npm.cmd run testnet:valuation`.
Official endpoint semantics:
https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md


## Actual operator batch result and remaining price coverage

Operator run on b8150e9 returned 517 holdings, 500 priced, 17 unpriced,
complete=false and currentEquityUSDT=null. No stale-price/account-change issue
was reported. The unpriced set included fiat, small-price crypto assets and
Unicode/numeric test assets. Names alone do not establish the reason.

Use `npm.cmd run testnet:valuation-diagnostics -- ASSET1 ASSET2` to distinguish
missing/inactive direct USDT markets, absent/zero/malformed/crossed books, and
available inverse market metadata. This diagnostic command uses two bounded public GETs,
requires no API keys, never places orders, and never treats inverse metadata alone
as a validated conversion price; the valuation reader separately validates books. It reports no balances or raw book values.
A later live snapshot may differ from the original valuation. Missing prices
continue to block total equity and daily risk authorization.


## Inverse USDT market coverage

Operator diagnostics found ten unpriced holdings with a tradable inverse market:
AED, ARS, BRL, COP, IDR, KZT, MXN, TRY, USD, ZAR. BONK/BTTC/PEPE returned zero
book prices; 456, JPY, THB and the Unicode test asset had no direct/inverse USDT
market metadata. These observations do not by themselves validate any price.

Batch valuation now supports an inverse USDT/asset market when its metadata and
positive, non-crossed, nonempty book validate. To sell the held quote asset for
USDT, divide its full free+locked quantity by the inverse ask. Fixed-point integer
math floors only the final value, avoiding a rounded reciprocal multiplied by
quantity. The displayed per-unit reciprocal is rounded down separately and is
not used to calculate the value. Source SPOT_INVERSE_ASK retains conversion
symbol/ask. A valid direct bid remains preferred, independent of response order.
No extra API request is needed; freshness and unchanged-account gates remain.
The CLI reports inversePricedAssetCount. Zero prices, absent markets, and missing
quotes still block full-account equity. No stablecoin/fiat peg is assumed. The
change does not enable trading or daily risk authorization. Actual rerun needed.
