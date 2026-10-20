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
