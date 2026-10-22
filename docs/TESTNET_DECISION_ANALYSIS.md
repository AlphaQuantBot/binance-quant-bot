# Recorded decision analysis

npm.cmd run testnet:decision-analysis -- 5 analyzes the latest five persisted sessions. The optional session bound is 1–20. The command reads the same separate decision-watch.sqlite file as decision-history, in a read-only SQLite snapshot. No API keys, exchange request, current quote, backfill, allocation change or execution capability are required.

The analysis counts session states and committed decision/review observations separately from unique signal candles. Repeated observations of the same candle across overlapping sessions count once in signals. Reason/blocker counts remain observation counts, since account state and assessments can change while candle input stays the same.

For a shared close time, both inputHash and signal must agree. Contradictory records stop with DECISION_ANALYSIS_SIGNAL_CONFLICT rather than selecting a favorable outcome. Candidate direction must match the corresponding crossing and a passed local review. Any execution authority, other symbol/strategy/environment, duplicate session ID or incompatible counts causes safe rejection.

Completed, stopped, interrupted and UNFINALIZED sessions remain distinct. Committed rows in an unfinalized session can contribute observations but never turn it into a completed session. Blocked observations lacking a valid candle key are counted explicitly without inventing a candle.

Coverage metrics apply only to the selected recorded candles. unobservedCandlesBetweenRecords includes gaps between separate sessions; these are not asserted to be runtime failures. continuousRecordedCoverage requires at least two unique candles with no gaps. Empty and single-candle histories cannot establish continuity.

The report includes signal counts, decision/review counts, unique candidate and locally reviewed candle counts, safe reason/blocker counts and stop-code counts. It does not simulate fills, infer prices, compute profitability or turn historical candidates into live intents. profitabilityAssessed and executionAuthorized remain false; ordersSubmitted remains zero.

Older console-only sessions are not imported. The earlier BUY candidate observation and ten-cycle console session therefore will not appear unless they were actually recorded in this database. An all-HOLD analysis is a valid description of the available evidence.

Tests cover overlapping sessions, conflicting hashes/signals, gaps and incomplete sessions, identity/authority rejection, unkeyed blocked observations and read-only SQLite integration. Pure checks for deduplication, conflict rejection and gap accounting passed in the orchestration runtime. Native Node tests remain pending because the development container is offline. Previous 361/361 validation applies to the preceding application revision.
