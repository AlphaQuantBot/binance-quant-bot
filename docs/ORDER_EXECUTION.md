# Durable order execution foundation (not enabled for exchange trading)

This change removes the three unreachable legacy mutation handlers from server.ts. They retried POSTs across hosts and updated local cash/cost basis on accepted responses. The routes still return LIVE_EXECUTION_PAUSED; no bypass or live adapter is introduced.

`src/server/orderExecution.ts` is a server-only foundation tested with injected exchange fixtures, not a deployed trading service. It is deliberately not connected to Express, the UI, real exchange credentials, or the existing browser bot loop. Do not remove the execution guard to activate it.

## Guarantees within one private journal

- A validated intent and deterministic client order ID are persisted and fsynced before calling the adapter once. The caller must persist/reuse requestId for the same trading decision. Repeating that ID returns its current record; changing its parameters is a conflict.
- In-flight/unknown submissions block new submissions for that account. No alternate-host POST retry exists. Unknown remains unknown after a missing order/query failure; it never becomes a fabricated rejection or fill.
- A matching read-only query reconciles status and exact decimal-string cumulative execution/quote quantities. NEW, partial, filled, canceled, rejected and expired remain distinct. Partial cancellation retains executed quantities. No cash, fees, cost basis or PnL is inferred here.
- Duplicate snapshots replace cumulative totals; they do not add fills. Older snapshots are ignored. Identity changes, regressing totals, invalid quantities and terminal-state changes fail validation.
- Restart changes persisted SUBMITTING to UNKNOWN. Private atomic files and an exclusive lock prevent a second writer. Corrupt records and persistence errors fail closed. Journal files and lock/temp files must stay private and are ignored by git.

## Operational limitations

Use one process and a local durable filesystem supporting exclusive create, atomic rename and fsync. This is not a distributed lock or a multi-user database. Never delete a stale lock without first proving the old process is stopped. Never delete/restore an old journal to permit retry: an exchange order may already exist. Backups and testnet resets require manual reconciliation. requestId retention must span restarts; generation/ownership will belong to the future server worker, not the browser.

The adapter interface requires single-attempt submission; no production adapter is supplied. A separate testnet-only adapter now handles status/ID validation, account binding and signed queries; see TESTNET_RECONCILIATION.md. Common symbol filters and per-order/position admission controls are implemented; native stop/cancel controls and the real provider for daily history/valuation evidence remain outstanding; percentage reference bands and a persistent risk evidence gate are implemented. Generic rejection payloads currently conservatively become UNKNOWN until queried. Verified trade and native-asset fee snapshots can now be stored, but user-data stream integration, complete historical account reconciliation and portfolio risk controls remain required before enabling any real orders. Only base-quantity intents are modeled here; quote-amount buys and stop/cancel requests are not implemented. Optional limitPrice is now journaled and included in idempotency identity; the testnet sender accepts only LIMIT IOC. Existing no-price records retain their prior identity for read-only reconciliation.

## Validation

Run `npm run test:security`, `npm run lint`, `npm run build`.
Fixtures cover lost replies, concurrent duplicate requests, changed intent conflicts, partial fills/cancellation, stale/duplicate snapshots, invalid responses, restart recovery, unknown account blocking/unblocking, exclusive/stale locks, corrupt journals, exact decimal persistence and pre-submit disk failure. No real Binance or Gemini requests are used.

## Reference contracts

- Binance timeout ambiguity: https://developers.binance.com/en/docs/products/spot/rest-api
- New order and query: https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade

## Next priority

Testnet-only adapter and fixture-tested order/trade/fee verification are implemented, with a read-only operator command. Account snapshots, known/open-order startup checks and durable capital reservations are now implemented in FundedExecution; see ACCOUNT_FUNDING.md. Common symbol/price checks and basic risk admission are implemented; see TRADING_RULES.md. Complete the trusted daily history/valuation provider, native stop/cancel lifecycle, execution-price-range rules, the server worker and real provider validation next. See DAILY_RISK_AND_PAPER.md for the persistent daily gate and targeted paper stop fixes. The browser's legacy loss-prevention strategy and paper accounting have not been repaired by this change.
