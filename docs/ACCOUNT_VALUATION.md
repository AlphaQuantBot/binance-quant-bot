# Read-only current account valuation

`npm run testnet:valuation` uses the independent APP_TESTNET_API_KEY and
APP_TESTNET_SECRET_KEY. It reads a consistent account snapshot, fetches current
a bulk exchangeInfo market catalogue and a bulk bookTicker snapshot for nonzero
assets on their direct asset/USDT markets, and reads
the account again. The CLI receives read capabilities only, without submit/cancel.

Free plus locked balances are marked exactly at the current bid. USDT is the unit
of account with price one; no other stablecoin is assumed pegged. Other assets
require a direct, tradable Spot Testnet USDT market with fresh verified bid data.
Indirect conversion and unsupported markets are unpriced, never valued at zero.
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

These are bid marks, not guaranteed liquidation proceeds: depth, slippage,
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
