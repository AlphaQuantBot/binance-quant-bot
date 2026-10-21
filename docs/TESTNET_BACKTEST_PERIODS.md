# Independent historical period comparison

This read-only research command keeps EMA20/50, rolling 120-candle signal evaluation, next-open fills, and explicit per-side costs unchanged. Each of 2–5 periods contains 1000 raw candles, including 119 warmup candles and 881 evaluated candles. Entire raw windows must not overlap. Each period starts independently with 100 modeled USDT and no BTC; positions and results are not compounded across periods. Remaining positions stay marked at each period's final close, without forced liquidation.

Start from an already captured dataset and fetch the preceding windows, serially:

```powershell
npm.cmd run testnet:strategy-periods -- capture 118337cbc564b61bbeecf0011dd81340878fad81ae46dc2e8fca37eeeb620c0b 3 0:0 10:0 10:5
```

The anchor is read locally and validated. Each additional window uses exactly one public time GET and one historical candle GET through the existing fixed-testnet reader. There are no retries or account requests. A failed fetch stops the command; any previously committed public datasets remain available. A failed command does not emit a successful comparison.

The output contains chronological periods and a comma-separated replayDatasetIds value. Replay those exact IDs with:

```text
npm.cmd run testnet:strategy-periods -- replay COMMA_SEPARATED_IDS 0:0 10:0 10:5
```

Replay opens only existing local datasets and makes no network requests. Every snapshot is hash-checked again. Missing or modified data fails; it never triggers a replacement download.

All fee and slippage rates are model assumptions. Exchange filters, liquidity, daily loss gates and one-shot execution policy remain outside this simulation. Separate windows are not statistically independent samples or evidence of live profitability. No strategy tuning or profitable-window selection occurs. No order, cancellation, capital reservation, reset or trading authorization is provided.

## Validation status

The preceding frozen-dataset comparison passed Windows lint and all 380 security tests, and the operator confirmed exact local replay. These new period-comparison changes require native lint and targeted tests; the agent execution environment was offline.
