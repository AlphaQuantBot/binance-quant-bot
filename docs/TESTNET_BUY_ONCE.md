# One matching-engine BTCUSDT testnet BUY attempt

The operator confirmed Windows sandbox-init and sandbox-status on 2cf5f18:
100 test USDT scoped cash/equity, zero owned BTC/loss/orders, no halt, account
consistent after reopening. Exchange order/test validation also previously passed.
This establishes local persistence and validation, not a completed trade.

## Command and effect

`npm.cmd run testnet:sandbox-buy-once` can send one real matching-engine LIMIT IOC
BUY to the fixed https://testnet.binance.vision/api/v3/order endpoint. It uses
only independent APP_TESTNET_API_KEY/APP_TESTNET_SECRET_KEY credentials and the
existing APP_TESTNET_SCOPED_JOURNAL (default .testnet_scoped/sandbox.sqlite).
It does not initialize, reset or rebase a journal. It is a foreground, finite
experiment, not an automated strategy, mainnet route or deployment.

The single experiment identity is sandbox_first_buy_v1. A valid fresh account,
real reference stream/book/filter context, unchanged scoped native balances,
no open orders/halts, free account cash and local capital are checked first.
Quantity/limit use the already validated order-check planner, principal <=25
test USDT against the persisted 100 test USDT allocation. Actual existing BTC
still counts toward exchange position limits; only confirmed scoped fills
become experiment-owned inventory. Current fee evidence must yield zero
undiscounted BUY fee estimate. Nonzero rates block this initial execution
until explicit fee-asset funding support is implemented.

The intent and reservation are committed before a second freshness check and
an atomic durable send claim. Only the process that created the first record
can reach that claim; the claim can be committed once. The account/allocation-
specific clientOrderId is persisted before the POST. No database transaction
is held across exchange I/O. Manual halt before claim prevents the send; a
halt after the claim cannot guarantee stopping a packet already being sent.

## Ambiguous outcomes and repetition

There is at most one POST attempt for this allocation/experiment identity,
including when the response is lost, malformed, 429/5xx, or the process stops.
A repeat invocation finds the existing identity before planning and performs
query-only reconciliation. It never re-plans or sends another order. A missing
remote order remains unresolved, including a crash after claim but before POST;
this intentionally sacrifices automatic progress to prevent duplicate orders.
Do not delete/change the journal to attempt the same experiment again.

A filled FULL response without native-fee evidence is verified through the
existing GET order + complete myTrades adapter. Verified cumulative fills and
BTC/USDT fees are applied idempotently. Incomplete, delayed or unsupported
third-asset fees keep the identity unresolved, without a fabricated balance or
PnL. A later sandbox-status or repeat buy-once invocation can query it again.
No query failure triggers a second POST. An expired, unfilled IOC is terminal
and also cannot trigger an automatic new attempt.

## Output and limits

Output reports testnetOrderAttemptedThisRun, sendResponse, orderStatus,
executedBTC, spentUSDT, verified native fees and the scoped capital audit when
terminal. CONFIRMED describes a verified terminal outcome, not necessarily a
fill; inspect executedBTC and orderStatus. RECONCILIATION_REQUIRED leaves capital
reserved and needs query-only follow-up. A post-fill price/account-audit failure
may stop the report after the fill was committed; use sandbox-status to inspect.

There is no automatic SELL, protective exit or continuing monitor in this command.
A purchased BTC position remains open. The 5 test USDT loss latch is observed
when an audit runs and blocks further preparation; it does not guarantee a sale
or a maximum realized loss of 5. Automatic/server trading remains disabled,
full-account dailyRiskAuthorized remains false and LIVE_EXECUTION_PAUSED stays
intact. Local capital audit now reports AUTOMATIC_TRADING_NOT_ENABLED rather than
claiming the new manual testnet command does not exist.

## Validation

279 tests, TypeScript and production build passed locally. Integration fixtures
exercise the actual fixed-host adapter with one POST only after a second SQLite
connection can see the committed claim, successful fill/native-fee recovery,
lost reply, malformed ACK, delayed order/trade reads, null query after restart,
nonzero fee/halts/stale evidence, persistence faults, third-asset fees, duplicate
claims, pre-send crash and unfilled IOC. Actual Windows matching-engine execution
has not yet been run; fixture fills are not reported as exchange fills.

Next operator command after git pull: testnet:sandbox-buy-once. Query-only
follow-up: testnet:sandbox-status. Local halt: testnet:sandbox-halt.
