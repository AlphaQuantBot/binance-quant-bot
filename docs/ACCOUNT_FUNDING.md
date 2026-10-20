# Testnet account reconciliation and durable capital holds

## Current boundary

This is server-side preparation for a connected pilot, not a production launch. Existing application mutation routes remain LIVE_EXECUTION_PAUSED. The browser bot has not been wired to the new service. No real exchange account or credentials were used to validate this implementation.

`FundedExecution` composes the order journal with a separate account-scoped capital journal. The testnet operator command has a runtime adapter that rejects submission unconditionally. There is no HTTP submission endpoint or unattended trading entry point.

## Account observations

The fixed-host testnet adapter obtains all SPOT balances (free and locked) and all open orders without a symbol filter. It reads each twice, rejects changing results, duplicates, malformed amounts, unsafe order IDs and invalid account permissions/types. Observation collection may take at most 10 seconds; freshness expires 30 seconds after collection began. Local reception time is used, not account updateTime, which does not measure response freshness.

Repeated reads are a conservative consistency check, not an atomic exchange snapshot. External trading can still occur after the observations; full user-data stream recovery and checks immediately before trading remain necessary.

Each local order is re-queried, with exact trade/fee verification, before account readiness is assessed. An unknown/missing remote order, missing executed-trade evidence, mismatched open order, external/manual open order, terminal order still listed as open, or disabled trading blocks readiness. External orders are reported, never adopted, canceled or sold automatically. An absent asset balance is unknown and cannot fund an order. The entire balance list is requested; no example balances or inferred token prices are inserted.

This compares present balances with present open orders and all locally known order records. It does not reconstruct deposits, withdrawals or the full historical account trade ledger and does not establish cost basis, realized PnL or portfolio value. Those are separate pending accounting tasks.

## Capital reservation rules

- Before a possible submission, exact decimal debits (principal plus explicit native-asset fee reserves) are persisted in an atomic, fsynced mode-0600 capital journal. A process lock protects one writer. Existing order journaling persists the intent before the network operation.
- BUY reserves a server-provided quote budget and fee requirements; SELL reserves the requested base quantity plus fee requirements. Pair assets must match the intent symbol. Fee assets are not converted or guessed. These inputs are server policy, never trusted browser fields.
- A request ID cannot change its intent or funding requirements. Multiple holds cannot allocate the same free balance twice. Existing request replays return the same order rather than submit again.
- Exchange free already excludes locked balances. A fresh, consistent account/order reconciliation settles represented local holds rather than subtracting an accepted order twice. Remaining free, not total free+locked, funds further plans.
- Every submission attempt invalidates the account observation. Another new order requires a fresh full reconciliation. Concurrent refresh/submit calls are rejected; a busy service cannot be closed.
- Restart retains holds but does not restore authorization from saved balances. A fresh provider observation is mandatory. Crashes between the two journals leave an orphan reservation that blocks readiness and cannot automatically resume into a submission.
- Missing/error/expired observations never release a hold or invent available funds. There is no timed release, auto top-up or delete-to-retry recovery. Disk failures stop before submission if the reservation cannot be persisted.

The order and capital journals are not a distributed transaction. Their write ordering is deliberately conservative: partial failure leaves capital held and requires review, rather than risking a duplicate order. They must share one private durable local filesystem and a single service process. Never remove a stale lock until proving the prior writer is stopped. Never erase/restore a journal to permit resubmission.

## Operator command

`npm run testnet:account`

Private environment configuration:
- APP_TESTNET_API_KEY / APP_TESTNET_SECRET_KEY: separate testnet keys.
- APP_TESTNET_JOURNAL: default `.testnet_order_journal.json`.
- APP_TESTNET_CAPITAL_JOURNAL: default `.testnet_capital_journal.json`.

The command may initialize an empty capital journal for a new account, reconciles any known order journal, and prints readiness, discrepancies, native-asset balances and open orders. It queries the exchange only; it can update the private local journals. It does not send, cancel or seed orders. An unready result or failed query returns an unsuccessful exit code; raw provider errors and credentials are suppressed. These files and lock/temp siblings are ignored by git.

## Remaining requirements before submission can be exposed

New testnet submissions now require bounded LIMIT IOC intents. BUY funding must cover the upward-rounded limit price times full quantity plus separate fee reserves. The exchange limit bounds BUY gross principal; it does not guarantee a fill or bound all fee costs. Common symbol filters, fresh-book slippage/spread checks, per-order notional/position ceilings and an explicit server policy are integrated; see TRADING_RULES.md. Unsupported exchange reference-price bands block submission. The current composition must not be enabled as an unattended trading engine.

Other remaining work: daily loss/position limits, emergency halt and stop behavior, server worker lifecycle, persistent/shared rate limits, robust streaming reconciliation, trade history/cost basis, reproducible paper accounting and real provider integration validation. The existing browser strategy's loss-prevention logic is still pending repair.

## Validation

Local fixtures cover stable/changed account observations, external/mismatched/missing orders, unknown submissions, stale/future/malformed/slow data, free-vs-locked accounting, exact reservations, insufficient principal/fees, account binding, orphan holds, restart, concurrent calls, disk failure and exclusive/corrupt capital journals. Run test:security, lint and build. No real exchange calls are needed for these tests.

Official contracts checked 2026-10-20:
https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/account
