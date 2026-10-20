# Read-only current account valuation

`npm run testnet:valuation` uses the independent APP_TESTNET_API_KEY and
APP_TESTNET_SECRET_KEY. It reads a consistent account snapshot, fetches current
trade contexts for nonzero assets on their direct asset/USDT markets, and reads
the account again. The CLI receives read capabilities only, without submit/cancel.

Free plus locked balances are marked exactly at the current bid. USDT is the unit
of account with price one; no other stablecoin is assumed pegged. Other assets
require a direct, tradable Spot Testnet USDT market with fresh verified bid data.
Indirect conversion and unsupported markets are unpriced, never valued at zero.
Zero holdings need no price query. Twenty non-USDT assets is the maximum per audit;
more require a bounded quote-collection strategy rather than unbounded API calls.
The existing strict trade-context reader may reject unsupported reference data;
this is reported as unavailable pricing, without a permissive fallback.

Every quote must still meet existing two-second book freshness at the final
account read. A ten-second total audit budget and unchanged balances, open orders
and account trading flag are required. Exact decimal products round down at 18
places. A single unpriced/stale asset or changing account makes
`currentEquityUSDT:null` and the CLI exits nonzero. Per-asset diagnostics remain
available, but a partial sum is never presented as whole-account equity.

These are bid marks, not guaranteed liquidation proceeds: depth, slippage,
liquidation fees and executable lot sizes are not modelled. Sequential REST reads
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
