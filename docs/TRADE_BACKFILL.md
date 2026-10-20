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

## Persistent scoped recovery and diagnostic activity merge

`npm run testnet:recover-history` uses the same explicit symbol/time settings and
independent keys. APP_TESTNET_RECOVERY_JOURNAL optionally selects its private
journal (default .testnet_history_recovery.json, ignored by git with lock/temp
files). Scope/account identity determines a stable recovery ID. PENDING is fsynced
before network reads, so restart cannot silently lose an interrupted request.

The command performs two full bounded backfills. Canonical trades, account,
symbol, interval, report clock and safety flags must validate and the two trade
sets must match. Changing reads remain pending. Read failures remain pending,
with no partial trade adoption. Previously retained trades must remain present
and unchanged; removals or conflicts latch CONFLICT and require review rather
than destructive automatic baseline replacement. Stable late additions can be
retained after two matching reads. Attempt/verification times are recorded.
Exclusive locking and atomic/fsynced replacement protect one process's journal.

STABLE_SYMBOL_WINDOW describes two consistent observations of one selected
symbol/window, not conclusive exchange completeness or continuous full-account
gap closure. The report always has accountGapClosed:false and
dailyRiskAuthorized:false. Empty stable reads cannot prove a reset. No equity
history activityIssues, midnight baseline or order-unknown state is cleared.

`mergeRecoveredActivity` compares recovered trades with a diagnostic activity
snapshot using explicit symbol/base/quote metadata. Matching IDs are not counted
twice; conflicting IDs/fees/pair mappings reject the merge. New manual/other-bot
fills can appear in the merged diagnostic snapshot, while unresolved local orders
remain unresolved. No local bot order is adopted, resized, canceled or replaced.
This helper is tested but not automatically fed into equity-history cursors:
a timed balance/event worker must first associate recovery scopes with the
correct observation interval. The CLI only records the scoped recovery journal.

Remaining work includes automatic symbol-universe discovery, interval-to-balance
event binding, delayed visibility checks, reset detection and worker orchestration.
Two equal reads can still both omit late exchange records. Actual configured
Testnet recovery has not run in this session. Fixture tests cover durable pending
state, retry after restart, changing/failed reads, immutable-history conflicts,
activity deduplication, malformed reports, process locks and corrupt storage.
