# Scoped BTCUSDT proposal and exchange validation

Actual operator valuation after 0e538b5: 517 holdings, 510 priced (10 inverse),
7 unpriced; full-account equity and daily risk remain unconfirmed. Do not change
that report to call a selected subset the whole account.

`npm.cmd run testnet:order-check` prepares a fixed BTCUSDT-only LIMIT IOC BUY
proposal. Proposed experiment capital: 100 test USDT; maximum order principal:
25 test USDT; proposed loss ceiling: 5 test USDT. These are proposal values,
not an account allocation, activated stop or enforceable loss guarantee.
The command requires at least 100 actually free USDT, no open orders, a valid
BTC balance record and fresh verified symbol, reference and commission data.
Quantity is floored to LOT_SIZE step; price is rounded up to the PRICE_FILTER
tick at current ask. Existing real BTC holdings remain included in exchange
MAX_POSITION checks. Unknown applicable filters block the proposal.

After local checks, exactly one signed POST is sent to the fixed testnet host's
`/api/v3/order/test`, never `/api/v3/order`. The adapter separately enforces
BTCUSDT/BUY/LIMIT/IOC, no stop, principal at most 25 test USDT, and an empty
successful validation response. No retries, endpoint fallback or matching-engine
capability is passed to this coordinator. Failure output contains only
allowlisted error codes. Reads do not dump all balances or secret keys.

Official Binance semantics: order/test validates order creation/signature but
never sends the order to the matching engine:
https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md#test-new-order-trade

A PASS confirms order validation only. It does NOT prove fills, realized fees,
profitability, stop-loss performance, persistent capital isolation or restart
recovery. The undiscounted fee estimate is advisory quote-equivalent arithmetic;
actual fee asset/payment and future rate are not attested or reserved. Output
explicitly keeps capitalReserved=false, lossLimitEnforced=false,
dailyRiskAuthorized=false and tradingEnabled=false, and lists remaining
scoped-capital journal/loss tracker/recovery blockers. Existing full-account
DailyRiskGate, funded worker, live containment and journal durability stay intact.
No synthetic full-account history is created from this BTCUSDT subset.

Before a matching-engine experiment, implement a durable scoped capital ledger,
owned-position tracking from confirmed fills/native fees, persistent loss halt,
restart/query recovery and reconciliation of unexplained balance changes. Windows
durable-write compatibility must be validated for that journal. No current command
runs such an experiment or starts a trading bot.

Local validation: 238 fixture tests, TypeScript and production build passed.
Actual Windows order-check validation remains pending the operator command.

## First operator order-check: reference freshness blocked

Actual operator run on 899a9c2 failed STALE_REFERENCE_PRICE before validation
POST; matchingEngineOrderCreated=false. The result alone does not identify
request age, exchange event age or a future timestamp/clock offset.

Reference and book were collected sequentially. They now start concurrently
after validated exchangeInfo. This removes avoidable waiting without retry,
fallback substitution, timestamp rebasing, or relaxing either freshness check.
Original local request start times and exchange event timestamps are retained.
When reference freshness still fails, the CLI reports only referenceKind,
requestAgeMs and eventAgeMs. Negative event age indicates a future exchange
 timestamp relative to the local clock; it remains blocked. Real response
ages and root cause are not inferred from the original generic error.
Local validation: 241 tests, TypeScript and production build passed. Operator
must pull and rerun testnet:order-check. Actual validation is still unconfirmed.

## Confirmed reference event age and one bounded re-read

Operator 4e571cc result: REFERENCE_PRICE, requestAgeMs=295, eventAgeMs=2170.
The HTTP request was recent but the exchange event exceeded the unchanged
2000ms limit. Neither a slow local request nor a future timestamp was reported.

Allow one new reference GET only after a successful positive non-null reference
fails solely for event age while its local request age is still within 2000ms.
The new response retains its own request timestamp and actual exchange timestamp,
then must pass every original reference check; the book/context is revalidated
after the extra read. There is no third read, order retry, transport/HTTP retry,
average substitution, fabricated timestamp or increase in freshness limits.
A null/mismatched refreshed reference blocks explicitly. Future timestamps and
slow requests do not qualify. Actual operator validation still pending.
Local validation: 244 tests, TypeScript and production build passed.

## Operator-observed order-list count filter

Operator on 4722cb3 reached UNSUPPORTED_SYMBOL_FILTER and supplied the actual
BTCUSDT exchangeInfo filter set. MAX_NUM_ORDER_LISTS was the unsupported filter.
Official Binance filters.md defines it as the maximum open order lists per
symbol, with EXCHANGE_MAX_NUM_ORDER_LISTS covering exchange-wide lists:
https://github.com/binance/binance-spot-api-docs/blob/master/filters.md#max_num_order_lists

The existing submission path creates a standalone LIMIT IOC order, not an order
list. Recognize these two filters, validate maxNumOrderLists as a nonnegative
safe integer, and add zero lists. No OCO/OTO/OTOCO or other list capability is
introduced. All unknown applicable filters still block. Price, lot, percent,
notional, normal order counts and position rules remain enforced. Tests include
the entire supplied BTCUSDT symbol filter set and malformed limit rejection.
Local validation: 246 tests, TypeScript and production build passed. Actual
operator order-check after this change remains pending; no matching-engine
order has been created by these checks.

## Warm public reference stream for order validation

The operator reported subsequent REST-reference event age 3297ms despite a recent
708ms request. Three public clock samples showed server offsets +208/+112/+114ms
with RTT 472/299/280ms. These small samples do not explain the multi-second age;
no timestamp correction or freshness relaxation is applied.

The order-check CLI now opens a single public BTCUSDT referencePrice WebSocket
at startup, in parallel with account reads. It injects a reader of actual stream
events into tradeContext. After exchangeInfo, a fresh stream event is selected
and a fresh REST book is requested. Stream payloads retain engine timestamp t
and local receipt observedAt. Both remain subject to the original 2000ms checks.
Official testnet stream documentation:
https://github.com/binance/binance-spot-api-docs/blob/master/testnet/web-socket-streams.md#reference-price-streams

The fixed URL is wss://stream.testnet.binance.vision/ws/btcusdt@referencePrice.
No credentials are sent. Native Node WebSocket is used, without new dependencies.
Only matching symbol/type and positive decimal prices are accepted; null clears
availability. Malformed, regressed or disconnected streams block. Stale/future
events cannot satisfy a reader. Waiting is bounded to four seconds, no reconnect
or REST/average substitution is attempted, and finally closes the socket on
success/failure. Errors before a reader exists are retained without an unhandled
promise rejection. Safe stream codes and actual freshness ages remain visible.

Default adapter callers without referenceReader keep the previous bounded REST
behavior; the CLI stream path never performs the REST reference refresh. It
still calls only /order/test, never the matching-engine order endpoint. This
change supplies a different real data source, not proof of order validation.
Local validation: 254 tests, TypeScript and production build passed. Actual
Windows order-check using the stream remains pending.
The host's separate public stream probe received no qualifying event within the
four-second wait and returned STREAM_REFERENCE_TIMEOUT (no account keys used).
This is an unconfirmed real stream result, separate from passing fixtures.
