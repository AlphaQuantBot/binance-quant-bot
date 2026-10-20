# Testnet native stop observation — 2026-10-21

`npm run testnet:protection` is read-only. Configure the independent testnet keys
`APP_TESTNET_API_KEY` and `APP_TESTNET_SECRET_KEY`, and set
`APP_TESTNET_PROTECTION_TARGET` to a local JSON file containing one explicitly
bound target, for example (illustrative values, not an order to submit):

```json
{"symbol":"BTCUSDT","orderId":"12","clientOrderId":"stop-12","quantity":"0.001","stopPrice":"50000"}
```

The command queries `/api/v3/order` twice by symbol/order ID on the fixed Binance
Spot Testnet host. Identity, SELL side, unchanged relevant fields, exact decimal
quantity/trigger, NEW status, untriggered working state and a two-second read
budget must pass. It reports `STATIC_STOP_OBSERVED` or separately
`STATIC_STOP_LIMIT_OBSERVED`. A limit can remain unfilled after triggering.
Missing/changed/canceled/partially filled orders, insufficient quantity, malformed
values and unsupported conditional state produce a nonzero exit. Transport or
configuration failures also exit nonzero, with a sanitized diagnostic.

This is evidence about one explicitly declared order at a moment in time, **not**
account-wide position coverage, a fill guarantee, readiness to trade, or proof that
the operator's declared quantity/trigger matches the desired risk policy. It does
not infer or adopt a position from an arbitrary exchange order. Old order update
timestamps are allowed for orders that remain NEW; freshness comes from the two
current authenticated queries. No market-price distance assessment is claimed.
OCO/list children and trailing orders fail closed until their state machines are
implemented. No persisted report is trusted as current evidence after restart.

The CLI receives only the read capability. It never sends, cancels or replaces
orders, and is not wired into browser badges or execution authorization. Existing
manual-order account reconciliation restrictions remain unchanged. Live routes
remain paused. Remaining work includes position-to-stop reconciliation, list and
trailing lifecycle handling, durable event processing, stop placement/replacement
with recovery, and the trusted daily account history/valuation producer.

Reference: Binance official Spot REST account and order schemas:
https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/account
https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade

Validation uses synthetic fixtures only; no exchange credentials or live requests.

## Position-to-stop reconciliation

`npm run testnet:positions` adds a whole-account inventory check around the
single-order observation. Set `APP_TESTNET_POSITION_PLAN` to a JSON plan:

```json
{
  "accountId": "testnet_<API-key fingerprint reported by testnet:account>",
  "cashAssets": ["USDT"],
  "positions": [{
    "positionId": "strategy-position-1",
    "baseAsset": "BTC",
    "quoteAsset": "USDT",
    "stop": {"symbol":"BTCUSDT","orderId":"12","clientOrderId":"stop-12","quantity":"0.001","stopPrice":"50000"}
  }]
}
```

The plan is operator classification, not proof of entry cost or bot ownership.
Cash exclusions must be deliberately reviewed: excluded assets are not claimed to
be protected positions. Every nonzero, non-excluded holding must be classified;
quantities for multiple positions sharing a base asset are added exactly and must
match free plus locked holdings. Each position has its own unique stop ID and
client ID; stops cannot be reused. Exact stop quantities prevent an oversized
order from receiving a positive result. Every bound stop must also appear in the
account's open-order snapshot, and unbound open orders block coverage. The account
is read before and after the individual audits; changes or a total window over ten
seconds invalidate the result. These are sequential REST observations, not an
atomic exchange snapshot; changes between identical observations remain possible.

`coverageObserved` describes only this read window, the declared cash exclusions,
and supported static stops. It is not a persistent protection badge or permission
to submit orders. No testnet credentials are present in this development session:
fixture tests verify the failure paths, while an actual configured testnet run
remains required before progressing to operational stop management.

## Durable stop-limit submission foundation

The internal testnet adapter and order journal now support a static SELL
`STOP_LOSS_LIMIT` intent through `stopPrice` plus the existing `limitPrice`.
The adapter uses GTC, never IOC for a protective stop, and validates the returned
order type, trigger, limit, standalone order-list identity and absence of trailing
parameters. Quantity and cumulative execution/fee reconciliation use the existing
exact accounting checks. The trigger is part of the durable client-ID fingerprint;
changing it under the same request ID is an idempotency conflict. Existing IOC
intent fingerprints are unchanged.

The journal persists before submission. A timeout or unconfirmed reply remains
UNKNOWN across restart; reconciliation queries the original client ID and never
resubmits merely because a query returns no order. No cancel or replacement logic
is enabled. There is no browser/HTTP/CLI submission path for these new intents.
The funded IOC coordinator and its capital ledger explicitly reject protective
stop intents until a dedicated position, filter, budget and lifecycle gate exists.
Calling the low-level adapter directly is not a readiness check and is not an
operator workflow. Its testnet host is fixed; production execution remains paused.

Fixture integration tests cover the signed stop-limit request, timeout, restart,
query recovery, repeat requests, trigger conflicts and malformed exchange replies.
An actual exchange run, exchange rule checks for conditional orders, position
reservation, cancel acknowledgement, partial-fill handling during replacement,
and recovery of ambiguous cancellation are still required before enabling stop
management. No claim of complete stage-two readiness is made.

## Durable cancellation state

Internal `OrderExecution.cancelStop(requestId)` now performs at most one automatic
cancel attempt for a retained protective stop. It requires a confirmed active stop,
records `REQUESTING` durably before DELETE, and records `UNKNOWN` until a validated
read query establishes a terminal outcome. Restart turns REQUESTING into UNKNOWN;
repeated cancel calls return the existing state without replaying DELETE. A missing
order or an order still NEW is not proof of cancellation. A fully filled order is
recorded as FILLED, not CANCELED. Executions require reconciled trade/fee evidence
before the cancellation state becomes RESOLVED. Unresolved cancellation blocks new
account submissions and account readiness, including after restart.

The fixed-host testnet adapter cancels only the retained symbol, exchange order ID
and original client ID. It assigns a deterministic cancellation client ID, then
queries by retained exchange order ID. The read normalizer accepts that exact
cancellation alias only on a terminal order; arbitrary aliases and order IDs fail.
The DELETE reply alone is never used as execution or cancellation confirmation.
Read/transport errors leave the cancellation unresolved. Operations on a journal
are serialized while reconciliation/cancellation is in flight.

RESOLVED means the cancellation attempt's final order outcome is reconciled; it
never means a position is currently protected. Cancellation can remove protection.
No new HTTP/browser/CLI cancel command is exposed. No automatic replacement is
implemented or authorized by this state, and cancel/replace atomicity is not
claimed. Replacement still needs a fresh position/balance/fee calculation and
conditional-order risk/filter checks. Existing single-process/manual stale-lock
recovery limitations remain. Tests use fixtures, never real exchange requests.

## Post-cancel remaining position and replacement proposal

`planStopReplacement` computes a proposal only after a reconciled terminal stop
and cancellation resolution. Complete execution/fee evidence is required even
for zero fills. Remaining base quantity is old stop quantity minus cumulative
SELL fills minus fees paid in the base asset. Quote/third-asset fees are retained
in settlement and never subtracted from base holdings. A fresh account snapshot
must start after the previous order update, have zero locked base and exactly the
computed free base. This conservative model supports a single position covering
the entire base holding; any other open account order blocks it. Transfers, extra
positions or balance discrepancies require separate reconciliation.

Quantity is rounded down to LOT_SIZE only, with uncovered dust explicitly reported;
a dust-only or below-minimum notional proposal is rejected. Zero remainder reports
POSITION_CLOSED with no candidate. The static stop-limit proposal checks both
trigger/limit ticks and bounds, limit <= trigger < current bid, notional limits,
percent-price evidence, supported conditional order counts and explicit operator
risk policy. Unknown relevant filters fail closed. This is not a complete Binance
execution-rule/rate-limit/commission-reservation gate. A bid check is conservative
planning evidence, not the exchange's last-trade trigger rule.

`npm run testnet:replacement-plan` performs read-only query reconciliation of an
existing journal order and before/after account reads. Configure
APP_TESTNET_REPLACEMENT_PLAN to a JSON object containing `previousRequestId`, a new
`requestId`, `stopPrice`, `limitPrice` and the explicit `policy` schema from
TRADING_RULES.md. Use the same independent testnet key/account and journal as the
previous steps. No default policy is injected. The CLI updates read reconciliation
in the existing private journal, but cannot submit or cancel exchange orders.

Every proposal has `submissionAuthorized:false`. It expires conceptually with its
observations and must never be treated as a reusable send permit. It does not
reserve balances, check a trusted full-account daily-risk producer, or submit a
replacement. Automatic orchestration remains disabled; actual testnet verification
and those gates are required before enabling it. Fixture tests verify the math,
partial/full fills, fee assets, dust and failure cases; no real testnet run has
been performed in this session.
