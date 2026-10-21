# Live execution pause — phase 1

Live trading is intentionally unavailable in this branch. The order, close-position and BNB-budget endpoints return HTTP 503 with `LIVE_EXECUTION_PAUSED` before exchange access. The browser bot cycle returns before changing live positions, balances or PnL. Paper mode remains available, but its profitability and accounting are not validated by these tests.

Previously, cooldown handlers manufactured successful fills and altered cached cash. Those three handlers now return rejection without mutations. This change does not cancel exchange orders, close holdings, reconcile prior records, or place stop-loss orders. Existing positions must be managed directly on the exchange.

## Validation

- `npm run test:execution-safety`: local HTTP requests verify all three operations cannot reach the downstream exchange handler or mutate state; also checks cooldown rejection and integration ordering.
- `npm run build`: production frontend build.
- No exchange credentials or real orders are used.

## Remaining blockers

Authentication, secret storage, the credential configuration endpoint, confirmed-fill accounting and duplicate-order prevention still need implementation. Synthetic market data and existing paper accounting remain unchanged. Do not treat this pause as making a public deployment safe. Do not remove the guard to resume live trading before those blockers are addressed.

The repository was based on main commit 777c69406cf0c735d9b698997f35ed4d57809358; the newer AI Studio ZIP is not imported wholesale.
