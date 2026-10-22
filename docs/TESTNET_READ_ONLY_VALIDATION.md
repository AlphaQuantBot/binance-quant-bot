# Read-only testnet validation record

## Tested revision and evidence source

Operator-reported Windows validation applies to code revision `1edcffe576e0dfeafdbe2504ef7a6a3c5c4202c4` on `codex/windows-durable-storage`:

- `npm.cmd run lint`: TypeScript completed without errors.
- `npm.cmd run test:security`: 433 tests passed; zero failures, cancellations, skips or TODOs.
- Results below were supplied by the operator from actual testnet commands and local SQLite readback. The agent execution environment was offline; these are not agent-run native tests.

Later documentation-only commits do not extend the code validation claim to untested implementation changes.

## Persisted monitor and unavailable-cycle behavior

Monitor `b24e94dd-b7f4-4205-9f29-f1f0b629e683` completed its bounded 60-attempt run:

| Field | Recorded result |
| --- | --- |
| State | COMPLETED_WITH_UNAVAILABLE_CYCLES |
| Recorded attempts | 60 |
| Accepted observations | 59 |
| Unavailable attempts | 1 |
| Unavailable reason | STREAM_REFERENCE_TIMEOUT |
| Parent and child persistence | true |
| BUY_CROSS / SELL_CROSS / HOLD | 1 / 2 / 56 |
| WAIT / CANDIDATE_ONLY / BLOCKED | 58 / 1 / 0 |
| LOCAL_CHECKS_PASSED | 1 |
| Unobserved candles between accepted records | 1 |
| Gap intervals | 1 |
| Continuous recorded coverage | false |

The complete run was read and analyzed by monitor ID. The unavailable attempt remained a stopped child with no accepted observation; it was not converted into HOLD or backfilled. An internal coverage gap and later accepted records demonstrate continuation after the unavailable attempt. This does not prove uninterrupted market coverage.

Earlier monitor runs also confirmed terminal handling of STREAM_REFERENCE_TRANSPORT_UNCONFIRMED: 36 accepted observations and a 37th failed child, without automatic reconnect. That run's exact 37 child IDs were read and analyzed; all 36 accepted observations were HOLD and contiguous.

## Observed BUY candidate and local review

Child `d1e83ad4-946c-4c74-8836-ece06a3b1ca3` was read from SQLite:

| Field | Recorded value |
| --- | --- |
| Strategy / symbol | EMA20_50_CROSS_1M_V1 / BTCUSDT |
| Signal / assessment | BUY_CROSS / CANDIDATE_ONLY |
| Reason | BUY_CROSS_WHILE_EXPERIMENT_FLAT |
| Review | LOCAL_CHECKS_PASSED / BOUNDED_CANDIDATE_LOCALLY_VERIFIED |
| Quantity | 0.0003 BTC |
| Limit price | 81752.01 USDT |
| Bounded notional | 24.525603 USDT |
| Proposed maximum | 25 USDT |
| Undiscounted fee estimate | 0 USDT |
| Discount applied | false |
| Experiment-owned BTC | 0 |
| Available experiment cash | 100.007035 USDT |

The notional equals quantity times limit price and is below the configured order cap. The fee estimate is the recorded observation, not a promise of future zero fees. The recorded price and timestamps are historical and cannot authorize a current order.

All execution blockers remained:
AUTOMATIC_TRADING_NOT_ENABLED, FULL_ACCOUNT_DAILY_RISK_NOT_AUTHORIZED,
EXPERIMENT_BUY_ONCE_ALREADY_USED, LOCAL_REVIEW_IS_NOT_EXCHANGE_ORDER_VALIDATION,
and FEE_ASSET_RESERVATION_NOT_AUTHORIZED.

exchangeValidated, capitalReserved, feeReservationAuthorized and executionAuthorized were false. ordersSubmitted was zero. No order-test call, reservation, allocation reset or new order was performed by this read-only validation. Consumed one-shot BUY/SELL rights were not reset.

## Reference availability investigation

Independent five- and ten-minute fixed-testnet public WebSocket probes completed without account/REST work:

| Duration | Messages | Intervals over 4 seconds | Longest client arrival interval |
| --- | --- | --- | --- |
| 300 seconds | 210 | 12 of 209 | approximately 6.05 seconds |
| 600 seconds | 369 | 21 of 368 | approximately 10.00 seconds |

No null prices were observed in those probes. These are client arrival intervals, not calibrated exchange-event ages. They establish that message gaps occur without decision account/REST collection; they do not isolate provider publication, network or local scheduling as the root cause.

Preparation uses measured book headroom and a wait bounded by the remaining context budget. Final limits remain: whole reference age interval within 0–2000 ms, context age at most 5000 ms, and book-request age at most 2000 ms. These limits were not increased to make sessions finish.

## Research outcome and remaining boundaries

Five non-overlapping historical public testnet datasets were captured and replayed with matching hashes and scenario results. Each period started independently with 100 modeled USDT. All five period results were negative under the assumed 10 bps-per-side fee, both with zero modeled slippage and with 5 bps-per-side adverse slippage.

These simulations omit exchange filters, liquidity, full account daily-loss authorization and consumed one-shot execution policy. Open model positions were marked at each final close rather than forcibly closed. They do not establish real-market profitability.

This milestone validates bounded read-only observation, explicit unavailable evidence, persistence/readback and an actual BUY local-review path with execution blocked. It does not authorize automated trading, another one-shot order, mainnet activity, or a full-account risk claim. It does not validate a profitable strategy.

The pull request remains draft and unmerged. No further live observation, repeated full-suite run or new trade is required solely to reproduce this documentation.
