# Binance testnet order and commission verification

## Scope and current activation boundary

The server-only `binanceTestnetAdapter.ts` now implements one-attempt bounded LIMIT IOC submission, signed order queries by original client ID, and paginated trade retrieval. The hostname is fixed to `https://testnet.binance.vision`; it cannot be configured to Binance production. Redirects and cross-host retries are disabled. The adapter is not installed in Express or the browser worker. Existing LIVE_EXECUTION_PAUSED routes are unchanged. Do not bypass them.

No real provider calls, credentials or trades were used during development. All current checks use local fixtures. This is not an announcement that the terminal is operational on Binance testnet or production.

## Verification behavior

- Requests bind to a testnet account identifier derived from that key. Wrong account/client IDs fail before network access. Request HMAC, timestamp and receive window are server-side. Raw provider bodies, signatures and keys are not logged by these modules.
- An accepted order is not automatically a fill. ACK-only, malformed data, unsafe integer IDs, missing/negative totals or unknown statuses fail validation. A failed submit stays UNKNOWN in the journal and is not retried.
- Queries match the retained original client ID, symbol, side and requested quantity. `-2013` on an order read returns absent, never permission to resend. Intent uses base quantity only; new submissions require limitPrice and are sent as LIMIT IOC. Legacy intents without a price remain queryable, but cannot be submitted.
- Trade pages are retrieved with symbol + orderId + fromId, starting at zero, 1,000 rows per page and at most ten pages. Truncated, non-progressing, excessive or mismatched histories fail verification. A future fill arriving between snapshots can cause a temporary totals mismatch; query again later, never send another order.
- Trade IDs deduplicate identical fills and reject conflicting entries. Quantity and quote totals must exactly equal the order's cumulative executions. Decimal arithmetic is exact to 18 places and avoids binary floating-point accounting.
- Fees remain grouped by original commission asset. BNB/BTC/USDT are not added together or converted using invented prices. An incomplete/error response does not mean zero fees.
- Verified trade evidence and fee totals persist in the journal. Subsequent snapshots cannot erase/change previously verified trade commissions. Cancellation preserves any already executed quantity and fees.
- HTTP 429/418 prevents further requests for Retry-After (default 60 seconds, bounded to one day). Cooldown is process-local; persisted/shared rate-limit management is still needed for production.

## Operator read-only reconciliation command

`npm run testnet:reconcile` queries existing journal orders and writes confirmed snapshots to that same private journal. It cannot submit orders: its runtime adapter replaces submit with an unconditional rejection. This command is not a bot or a seed-order creator.

Set these separately in a private environment, never in git or chat:

- APP_TESTNET_API_KEY
- APP_TESTNET_SECRET_KEY
- APP_TESTNET_JOURNAL (optional; default `.testnet_order_journal.json`)

It requires an existing journal belonging to the derived testnet account. It does not create initial orders or import a production journal. An absent journal, different account, unresolved order or unverified trade list exits unsuccessfully. Summaries contain request IDs, symbol, order status, executed quantity and native-asset fees; raw provider errors and secrets are suppressed. Exchange access is read-only, while the local journal is intentionally updated. Acquire no other process on the same journal; stale locks require safe operator recovery described in ORDER_EXECUTION.md.

An order absent from a new provider query does not produce a successful fresh verification merely because an older settlement was stored. Testnet resets/history retention can require manual review; do not reset the journal to permit a resend.

## Still required before a connected pilot

Current exchange-state and fee verification does not replace full account reconciliation. A repeated-read account snapshot, known-order/open-order reconciliation and durable capital reservations are now implemented in FundedExecution; see ACCOUNT_FUNDING.md. Common symbol filters and per-order/position admission policy are now implemented; see TRADING_RULES.md. Remaining requirements include exchange reference-price bands, historical account accounting, daily-loss/stop controls, persistent rate limits, bounded server worker and user-data stream recovery. Stop/cancel submissions, quote-amount intents and realized PnL/cost basis are not implemented here. Bounded LIMIT IOC is supported; see TRADING_RULES.md for common filter and risk checks and remaining reference-price restrictions. No automated submission entry point is supplied until those controls are ready. The browser strategy/paper accounting remains a separate pending repair.

## Verification and references

Run `npm run test:security`, `npm run lint`, `npm run build`. Fixtures cover HMAC payloads, fixed host, single attempt, timeout/429/5xx, identity/precision checks, partial cancellation, native-asset commissions, multiple pages, missing/conflicting trades, persisted settlement and read-only operator reconciliation.

Official API contracts checked 2026-10-20:
- https://developers.binance.com/en/docs/products/spot/testnet/general-info
- https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/account
- https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade
