# Bounded read-only trade-history backfill

`npm run testnet:backfill` queries the authenticated account's trades on one
explicit symbol through the fixed Spot Testnet `/api/v3/myTrades` endpoint.
Configure independent testnet keys and APP_TESTNET_HISTORY_SYMBOL,
APP_TESTNET_HISTORY_START_MS and APP_TESTNET_HISTORY_END_MS. Times are inclusive
integer Unix milliseconds, in the past, spanning at most 24 hours. There are no
implicit date/symbol defaults or production-host fallbacks.

A response smaller than 1000 is retained for that window. A full 1000-row response
is potentially truncated: the time window is split into [start, mid] and
[mid+1, end], then queried again. Parent full pages are discarded rather than
assumed complete. This avoids advancing from a potentially recent truncated page
and silently skipping earlier IDs. Only supported `symbol + startTime + endTime`
parameters are sent, never that combination with fromId. Gaps in numerical trade
IDs are allowed; identifiers are not assumed contiguous for this account.

At most 64 requests and 20,000 retained trades are allowed per call. If a single
millisecond is saturated, a budget is exceeded, a request fails, or malformed,
unsafe, duplicate/reused IDs or out-of-window rows appear, the operation fails
without returning a partial-success report. No automatic request retry occurs.
Transport cooldown and redirect protections are inherited from the testnet
adapter. Native quantity, quote amount and commission remain exact strings, with
side and execution time preserved. Results are sorted by time/ID.

The report is the provider's enumerated history for this symbol/window, including
manual or other-bot fills on that symbol. It is not all-account symbol discovery,
proof of complete exchange history visibility, gap closure or a reset detector.
REST data may appear late; repeated overlapping audits and a durable event/cursor
worker are still needed before claiming continuous coverage. An empty interval is
not proof that an account was reset. `fullAccountCoverage:false` and
`dailyRiskAuthorized:false` remain explicit. Results are not automatically adopted
into bot order journals or used to erase existing history-gap diagnostics. No
sender, canceller or automatic replacement loop is exposed.

Validation uses synthetic responses for unsaturated/empty windows, split full
pages, single-millisecond saturation, duplicate/malformed rows, provider failure
and signed fixed-host requests. No actual configured testnet run has occurred in
this session. Full-account backfill integration remains outstanding.

Official parameter combinations and response limit:
https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/account
