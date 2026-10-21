# Frozen-data cost comparison

This research command compares 2–8 explicit fee:slippage scenarios on a single immutable set of public BTCUSDT candles. Rates are integer basis points per side (0–1000); zero is a deliberate diagnostic assumption, not a claim that trading is free. The command does not optimize strategy parameters, select a trading policy or authorize execution.

Commands:
- npm.cmd run testnet:strategy-compare -- capture 0:0 10:0 10:5
- npm.cmd run testnet:strategy-compare -- capture-at END_CLOSE_TIME EXPECTED_INPUT_HASH 0:0 10:0 10:5
- npm.cmd run testnet:strategy-compare -- replay DATASET_ID 0:0 10:0 10:5

capture fetches one latest 1000-candle window. capture-at fetches one specified historical window, rejects forming/future/misaligned end times, and requires its full input hash to match before writing storage. Both use only the existing unsigned public time and kline GETs. Failure never switches to another dataset.

The operator's earlier window can be requested with end close time 1792596719999 and expected hash 118337cbc564b61bbeecf0011dd81340878fad81ae46dc2e8fca37eeeb620c0b. Its prior single-scenario result at 10:5 was seven closed round trips and a total close-marked model result of -0.339404737225194221 USDT, with one remaining position. Those values are supplied evidence, not an assertion that a future re-fetch will match.

Snapshots are stored separately at .testnet_backtests/datasets.sqlite using SQLite WAL/FULL, indexed by the SHA-256 of the complete raw candle array. The directory is ignored by Git. Existing identical captures preserve their first stored metadata; application code never updates a dataset. Reads validate the hash and candle window again. Missing, changed or invalid data fails instead of fetching a replacement. Keep WAL/SHM companions with a stopped-process backup.

Observed server time and the historical evaluation boundary are separate fields. Pinned historical evaluation uses the end-of-window boundary, never presents it as a fresh observed server clock, and cannot imply present market freshness.

replay opens only existing local storage read-only and performs no network request. Every scenario uses a clone of the same dataset, and each computed input hash and signal count must match. The report is compact: cost assumptions, closed net results, assumed fees, open position, close-marked equity and drawdown. It exposes datasetId/inputHash and sameInputVerified=true. Replaying the same data and assumptions is deterministic.

The original next-open, adverse slippage and exact fixed-point accounting model is unchanged. Open positions stay open. Exchange filters, liquidity, one-shot execution restrictions and daily-loss policy are still not modeled. Higher assumed costs can also reduce modeled position size, so this report does not assert that every outcome must vary monotonically with cost. No API keys, scoped-capital journal, order/test or exchange mutation is used. All reported executions remain hypothetical.

Six tests cover persistence/reopen and comparison identity, deterministic replay, immutable duplicate captures, expected-hash rejection before disk writes, corrupted data, missing storage, explicit bounded scenarios, pinned historical time handling and the local replay path. Native SQLite/Node tests remain pending because the development container is offline.
