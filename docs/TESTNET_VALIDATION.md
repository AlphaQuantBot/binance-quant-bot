# Windows and read-only testnet validation

## Validated revision and evidence source

Latest validated application revision: 550377d05b8085ed6cce5cabe37e7cea5465a744 on codex/windows-durable-storage. Earlier ten-cycle and lint evidence below applies to d9e2a5433bc39482241e708168568350972fa894.

The following results were supplied by the operator from Windows PowerShell in the local testnet checkout. They were not executed in the development container, which was offline. The documentation commit containing this record does not change application behavior.

## Latest persistent-history verification

- Operator full security suite: 361 tests, 361 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; duration 102941.7384 ms.
- Actual command: npm.cmd run testnet:decision-watch -- 3.
- State COMPLETED, stopCode null; requested/attempted/completed/unique counts all 3.
- Zero duplicate observations, missing candles or gap events; continuousObservedSession true.
- Three HOLD/WAIT decisions; zero candidates, local reviews or submitted orders.
- First close time 1792594859999; last close time 1792594979999.
- persistedSession true; sessionId 31487398-4d6a-469e-a415-889a1e186fd1.
- A separate npm.cmd run testnet:decision-history process returned the same session ID, counts and completed summary.
- Experiment cash 100.007035 USDT, owned BTC 0, observed loss 0; executionAuthorized and automaticTradingEnabled false.

This verifies committed summary storage and readback in a separate process. Abrupt exit, contention, revision rejection and scoped-file protection passed the supplied test suite; they were not separately exercised against the actual exchange. No new-revision lint result is asserted from the 361-test summary alone.

## Earlier native checks (d9e2a5)

- npm.cmd run lint: tsc --noEmit completed without reported errors.
- npm.cmd run test:security: 354 tests, 354 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.
- Reported suite duration: 83264.0342 ms.

The suite covers storage/ACL behavior, durable failure and recovery paths, clock measurements, stream lifetime and startup, safe diagnostics, decision/review logic, and execution containment. Fixture POST tests are not evidence of additional actual exchange submissions.

## Earlier ten-cycle actual watch (d9e2a5)

Command: npm.cmd run testnet:decision-watch -- 10.

- State COMPLETED, stopCode null.
- Requested, attempted and completed cycles: 10 each.
- Unique candles: 10; duplicate observations: 0.
- First close time: 1792591199999; last close time: 1792591739999.
- Missed candles and gap events within session: 0.
- continuousObservedSession: true.
- Signals and decisions: 10 HOLD, 10 WAIT; no candidate or local review in this session.
- Selected measured clock round-trip durations: 346, 341, 408, 335, 339, 343, 340, 349, 349, 359 ms.
- Reported experiment cash: 100.007035 USDT; owned experiment BTC: 0; observed loss: 0.
- ordersSubmitted: 0; executionAuthorized: false; automaticTradingEnabled: false.
- persistedSession: false.

This verifies one completed ten-cycle actual testnet observation under the supplied conditions. It does not establish uninterrupted operation under every future network condition or strategy profitability. The supplied console output is the evidence; that earlier watch revision did not retain a durable session history.

## Earlier actual candidate observation

An earlier revision produced BUY_CROSS while the experiment was flat and returned CANDIDATE_ONLY / BUY with LOCAL_CHECKS_PASSED:

- quantity 0.00029 BTC; limit price 83616.01 USDT.
- bounded notional 24.2486429 USDT.
- reported undiscounted fee estimate 0 USDT; discountApplied false.
- exchangeValidated, capitalReserved, feeReservationAuthorized and executionAuthorized all false.
- ordersSubmitted 0; the consumed one-shot BUY blocker remained present.

This supplies actual local candidate-review evidence at an earlier revision, not proof that the later three- or ten-cycle sessions exercised that path or that an order was exchange-validated or filled.

## Remaining boundaries

The PR remains draft and unmerged. Automatic and mainnet execution remain paused. Full-account daily risk is not authorized; local order review is not exchange order validation; fee-asset reservation is not authorized; the earlier one-shot BUY/SELL experiment has already been consumed. Existing account BTC is not experiment inventory.

The validation above does not authorize a new allocation, reset, order, order/test request, cancellation, automatic sender or deployment. No production build result is claimed.
