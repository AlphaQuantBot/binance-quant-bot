# Daily risk evidence gate and paper stop repair

## Critical activation boundary

DailyRiskGate is a durable consumer of trusted full-day account evidence, not an account-history collector or a portfolio valuation engine. No real evidence provider is implemented in the Binance testnet adapter yet. Consequently new FundedExecution submissions are blocked with DAILY_RISK_EVIDENCE_REQUIRED when using that adapter, even if account reconciliation and price rules pass. Operator audit commands remain exchange-read-only. Application live routes remain LIVE_EXECUTION_PAUSED.

Tests inject explicitly labeled evidence fixtures. These must never be copied into production, generated from browser balances, or replaced by a success/verified flag. A real historian/valuator must independently collect and reconcile all relevant account events, external flows, fees and mark-to-market prices before this gate can be described as operating on an exchange account. The source/scope fields are an internal attestation contract, not cryptographic proof or independent verification of those calculations.

## What the gate checks

An explicit dailyLossLimitQuote is mandatory in server risk policy. No user-specific monetary threshold is selected by this change.

Evidence must cover the current UTC day from midnight through the reconciled account observation, include both realized and unrealized PnL, identify the exact account/testnet environment and USDT numeraire, bind to a normalized balance digest, and price every nonzero asset. Missing/unpriced assets, wrong scope, partial-day history, future/stale evidence and mismatched balances block admission.

The evidence provider must supply current/opening equity and cumulative external inflows/outflows in that numeraire. The gate computes:

current equity - opening equity - external inflows + external outflows

Negative result magnitude is loss. This is an account-equity change after external-flow adjustments; no stablecoin/USD parity, token price or cost basis is invented by the gate. It does not independently reconstruct these supplied values.

Within a UTC day, the opening equity and configured loss limit cannot be replaced, historical flow totals cannot decrease, and observation coverage cannot move backward. A threshold breach (including equality) latches new BUY admission closed for that day. Restart or later equity recovery does not clear the latch. A new UTC day needs a new complete history proof before a daily budget can reset.

A verified reducing SELL may still pass after the daily BUY latch; fresh account data, complete evidence, price/rule/funding checks and all other policy controls still apply. Missing evidence blocks both sides. The gate submits no automatic close, stop or cancel order.

The service's server-only emergencyHalt method persists an independent halt that survives restart and day rollover, and blocks new sends on both sides. No resume/bypass HTTP endpoint exists. It cannot undo a POST already in flight or cancel an existing exchange order. The local risk journal uses an exclusive process lock, atomic mode-0600 writes and fsync; persistence/corrupt-state failures stop admission. Keep its lock and data with the other private journals. Do not delete or restore older state to clear a risk budget.

## Paper bot exit changes

- A configured trailing-stop percentage is now actually evaluated against the observed high-water mark. A stop can realize a loss; no profit-only veto remains on this paper exit path.
- Take-profit and stop reasons are separate from the sign of net PnL. Quantity and entry price must be present and valid; missing positions are not fabricated from a default allocation.
- PnL uses actual saved paper quantity, entry and exit prices. Both-side 0.1% assumed paper fees are explicit; no BNB-discount inference from the live wallet is used here. The model does not simulate exchange order-book slippage or establish actual Binance fees.
- Losing exits affect the win-rate update and strategy capital. Existing rounded legacy win rates remain approximate; this is not a reconstruction of historical performance. Profit chimes are not played for losing exits.
- A position binds to its originating bot order where possible. Open positions are not switched to scanner candidates, and a missing symbol quote cannot borrow another token's price.
- Automatic low-balance top-ups and the unconditional 10,000-to-1,000 paper-balance rewrite are removed. Open bot positions reserve their saved entry cost when preparing new paper entries; unknown position costs block further bot allocation. Paper trade size is no longer raised to an artificial 50-USDT minimum. Per-cycle reservations prevent multiple bots sharing the same snapshot from repeatedly allocating the same funds.

These are targeted exit/risk corrections, not a completed unified paper wallet. Manual-order cash handling, restart/manual-close reconciliation, account-wide daily risk in the browser, exact historical backtests, and full paper accounting remain pending. The browser timer is still not a 24/7 server worker. Live stops/cancels and protective-order reconciliation are not implemented by these paper changes; existing real positions must still be managed directly on the exchange.

## Validation

Fixture tests cover daily flow adjustment, exact threshold equality, restart/recovery latch, UTC rollover, stale/incomplete/wrong-scope evidence, unpriced assets, changed baseline/limits, persistent halt, locked/corrupt/disk-failure state, no-send on missing evidence, reducing exits, reference-price precedence/window/failure paths, and paper losses/trailing/fee/stat/quote/funding behavior. No real Binance or Gemini calls were made.
