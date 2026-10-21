# Durable local BTCUSDT experiment accounting

Actual operator result on 2056c9b: order/test PASS, quantity 0.0003 BTC,
limit price 83000.89, principal 24.900267 test USDT, undiscounted current fee
estimate zero, source TESTNET_WEBSOCKET. This was exchange order validation,
not a matching-engine execution. Whole-account valuation remains incomplete.

## What is implemented

ScopedTestnetJournal persists the fixed experiment configuration (100 test USDT
capital, 25 test USDT maximum order principal, 5 test USDT loss limit), account
identity, allocation identity, initial BTC/USDT total balances, intent identities,
verified confirmations/native fees, and irreversible halt reasons. Existing BTC
is a reconciliation baseline, never experiment-owned inventory or profit.
The other 515 holdings are outside the experiment's equity calculation; they
remain unpriced/otherwise represented by the separate whole-account reports.
No full-account DailyRiskEvidence is manufactured.

Storage uses Node's built-in node:sqlite (available in the operator's Node 24),
WAL and synchronous=FULL, explicitly checked on open, plus integrity/schema/state
validation. Every mutation executes BEGIN IMMEDIATE/COMMIT with rollback on
failure. No success result is returned before commit. This avoids the JSON
journal's platform-dependent direct directory open/fsync sequence; it does not
change old journal durability semantics. SQLite's own OS/filesystem durability
is still a dependency. Tests cover commit recovery after process termination;
actual Windows initialization/reopening remains to be verified by the operator.
No dependencies or package installation steps were added.

Initialization requires actually free USDT >=100, trade-enabled account and no
open orders. Repeating init reuses the existing allocation and never resets its
baseline, inventory, limits, history or halt. Changes to persisted limits/account
fail validation. Selected BTC/USDT native balances are compared against baseline
plus confirmed scoped fills/fees; unexplained changes or external open orders
persist a halt. Changes to unrelated test assets do not create scoped PnL.

Intent preparation commits an allocation/account-specific deterministic client ID
and reservation before any potential future exchange write. Reusing a request ID
returns created=false and the same identity; conflicting reuse is rejected.
Unresolved orders block preparation of another order. Recovery receives only
query(intent, clientOrderId); no submit/cancel callback exists. A missing remote
order remains unresolved, even if the process stopped before a future sender
could send it. There is no automatic resend or implicit release. A production
sender must still implement its first-send boundary; none is enabled here.

Confirmations require exact identities, cumulative quantities/notional bounded
by the requested limit, non-regressing status/totals, immutable retained fills,
and complete validated native-asset fees. Reapplying identical confirmation does
not debit twice. Experiment-owned BTC and cash are reconstructed from verified
cumulative fills, including BTC or USDT fees. Positive third-asset commissions
remain unsupported/unresolved, never silently converted or ignored. Unknown,
partial or missing-settlement outcomes continue to block new preparation.

Equity is scoped cash + owned BTC marked at a fresh verified BTCUSDT bid. A loss
>=5 test USDT persists a halt; later price recovery or reopening cannot clear it.
This gate acts when audit() observes a fresh account/quote, not continuously.
It is not a guaranteed stop execution price or a whole-day/account loss measure.
No automatic reset/unhalt operation is provided. Manual halt remains available
locally without an exchange request or secret key (account API key still selects
the correct account-bound record).

## Operator commands

Use the same private process environment as preflight. The default local journal
is `.testnet_scoped/sandbox.sqlite`; it and sidecars are excluded from git. Keep
one authoritative configured journal for the workload. Creating another file does
not reserve a second exclusive fund pool at Binance. Local earmarking does not
transfer or lock exchange funds; no other worker is authorized by this journal.
APP_TESTNET_SCOPED_JOURNAL can select an intentional local journal path.

1. `npm.cmd run testnet:sandbox-init` creates/reuses the local allocation, queries
   any pending identity without resend, and audits the native balance/quote.
2. `npm.cmd run testnet:sandbox-status` reopens the persisted record in another
   process, performs query-only recovery and a fresh audit without initialization.
3. `npm.cmd run testnet:sandbox-halt` persists a local operator halt.

Output contains allocated cash, owned BTC, scoped equity/loss, halt and unresolved
counts, recovery counts and explicit tradingEnabled=false. No keys or full
portfolio dump is printed. A failed audit after successful initialization does
not erase the committed allocation; status can inspect it later. Do not delete
or reinitialize a halted/unresolved journal to bypass its state.

All three CLI commands perform GET/read-only exchange operations (or local halt).
The separate sandbox-buy-once command now permits one explicit matching-engine
testnet BUY after the operator confirmed Windows persistence/reopening; see
TESTNET_BUY_ONCE.md. Automatic trading/live routes, the old funded worker,
protective replacement worker, whole-account risk gate and LIVE_EXECUTION_PAUSED
remain unchanged.

## Validation

268 tests, TypeScript and production build passed locally. New tests cover
account/config binding, actual free cash, restart reuse, durable idempotent
intent preparation, null query/no resend, verified fees in both native assets,
partial/missing/unsupported fees, repeated confirmation, loss latch, external
activity, two connections, failed SQLite write and abrupt process termination.
The Linux runner exercises SIGKILL recovery; Windows uses an immediate process
exit in that fixture. Neither substitutes for the actual Windows command result.

Primary runtime/durability references:
- https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- https://www.sqlite.org/pragma.html#pragma_synchronous


## Actual Windows foundation verified; manual one-attempt sender added

Operator init/status on 2cf5f18 created and reopened the allocation successfully:
cash/equity 100 test USDT, owned BTC and loss zero, no halt/unresolved orders,
accountConsistent=true. This confirms those actual Windows persistence reads.
The journal now also persists sendAttemptAt before the single manual testnet POST;
existing initialized state remains compatible without reset or new allocation.
The new execution command and its narrower fee/one-attempt constraints are
specified in TESTNET_BUY_ONCE.md. Actual matching-engine result is still pending.
