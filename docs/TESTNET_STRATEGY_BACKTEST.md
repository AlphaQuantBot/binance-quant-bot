# EMA crossing research backtest

Command: npm.cmd run testnet:strategy-backtest -- FEE_BPS SLIPPAGE_BPS

Both arguments are mandatory whole basis points from 0 through 1000, applied per side. One basis point is 0.01 percent. For example, 10 5 explicitly models a 0.10 percent fee and 0.05 percent adverse slippage on each buy and sell. These are user-selected assumptions, not observed Binance commissions or measured execution costs. No default zero fee is invented.

The command makes exactly two unsigned GETs on testnet.binance.vision: /api/v3/time then /api/v3/klines for the latest 1000 fully closed BTCUSDT one-minute candles. endTime excludes the forming minute. Missing history, malformed/gapped/forming OHLC, bad server time, slow reads, rate limits and failed requests stop without retry or fallback. It needs no API keys and does not read or write the experiment journal.

Each signal uses the existing EMA20_50_CROSS_1M_V1 evaluateSignal over its own trailing 120 candles. This preserves the current rolling-window EMA initialization; it does not silently replace it with an indefinitely accumulated EMA. There are 119 warmup candles and 881 evaluated candles when 1000 are returned.

The isolated model starts with 100 virtual USDT and zero BTC. It is long or flat: a BUY crossing while flat schedules a buy; a SELL crossing while long schedules a sell. It never shorts or borrows existing account BTC. A signal can fill only at the following candle open, with adverse slippage. A final-candle crossing has no following candle and cannot receive a modeled fill. All OHLC input is validated before accounting begins.

Each entry spends at most 25 model USDT including its assumed USDT fee. Quantity and money accounting use fixed 18-place integers; entry costs round up and proceeds round down. Fees are charged in model USDT on each side. Two quote atomic units are conservatively reserved for rounding. These are research quantities, not exchange-valid order sizes.

Output distinguishes closed-round-trip net result from remaining cash, owned model BTC and unrealized close-marked value. Open positions are not forcibly sold at the last close. Drawdown is measured only at candle closes, not intrabar. Gross-positive but fee-negative closed trades count as losses.

Important model boundaries are explicit in assumptions: exchange tick/lot/notional filters, liquidity, the consumed one-shot execution policy and daily loss limits are not simulated. The model does not reproduce the live experiment's execution authorization. Results are neither actual fills nor whole-account performance, and a short testnet history does not establish live strategy profitability.

Reports include the input hash, candle time range, exact cost assumptions and modeled execution sequence. Results are console-only (persistedResult=false). ordersSubmitted=0, executionAuthorized=false and automaticTradingEnabled=false remain fixed. No order/test, submission, cancel, allocation/reset or journal capability is exposed.

Tests cover next-open causality, costs and entry budget, gross-positive/net-negative exits, last-candle signals, unclosed positions, OHLC/time rejection and fixed unsigned reader requests. Five pure model scenarios passed in the orchestration JavaScript runtime with the repository's EMA algorithm; native TypeScript/Node tests and actual testnet backtest output remain pending.
