# Data provenance — phase 3

Market ticker and candle APIs no longer invent prices when offline. Binance WebSocket mini-tickers and REST 24-hour tickers populate a separate per-symbol feed; a symbol expires after 30 seconds without a genuine update. Responses carry source, reception time and generated=false. A health response derives its ONLINE/OFFLINE state from that feed and does not report invented latency.

Candle requests validate symbol/interval/limit, numeric values, ordering, OHLC ranges and latest bar age. Failures return HTTP 503 with no candles. The frontend rejects missing/unknown provenance, synthetic/fallback flags and old data, clears obsolete charts, refreshes candles, and ignores responses to superseded symbol/interval requests. Bot cycles require a fresh ticker feed and explicitly RUNNING bots. Default templates have no holdings or fabricated wins and start paused; saved bots also load paused. Existing local histories are labeled unverified, not reconciled with the exchange.

AI request failures return unavailable errors instead of canned BUY signals. Model output is labeled generated/unverified, and model-based automatic bot deployment is blocked. The static early-token list, generated order book and random backtest remain UI demonstrations with explicit labels. Demo backtest results cannot deploy bots. This is not a real historical backtesting engine.

Account cooldown responses no longer manufacture verified balances or successful key validation. Other legacy balance valuation logic still uses approximations and must be reviewed before live use. These changes are not a complete reconciliation or accounting engine. All live mutations remain paused, and nothing in this branch places protective orders for existing exchange positions.

Tests use a local HTTP fixture and deterministic upstream failures/data. No Binance or Gemini request is made by the tests. Browser QA uses static fixtures, not a production exchange connection.
