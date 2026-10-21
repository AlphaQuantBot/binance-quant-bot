# Bounded testnet execution and explicit risk admission

## Activation boundary

Application live routes remain paused. No real testnet or production requests/credentials were used in development. This is fixture-tested admission code, not an enabled trading product. Read-only operator reconciliation commands still cannot submit.

A FundedExecution instance with no explicit server RiskPolicy can reconcile an account but cannot send new orders. There are no permissive policy defaults or browser-controlled limits. Policy limits must be chosen by the operator during a later staging setup; test fixtures are not deployment recommendations.

## Price-bounded intents

- New testnet sends require limitPrice and use LIMIT with timeInForce=IOC. There is no MARKET fallback or GTC remainder. IOC may fill fully, partially, or not at all; canceled/expired remainders are not treated as filled and are not automatically resent.
- BUY fills must be at the limit or better; SELL at the limit or better, before fees. The absolute limit bounds order price, not execution availability, total fee costs, daily loss, or a portfolio outcome.
- limitPrice joins the persisted intent, client order ID and capital-reservation identity. Changing price on an existing request ID is a conflict. Legacy no-price records keep their original identity and remain queryable, but the real adapter will not submit them.
- BUY principal reservation must cover ceil(quantity * limitPrice) using exact 18-place arithmetic, plus separate native-asset fee reserves. No guessed market price is used to authorize a lower budget.
- Order queries verify that price, order type and time-in-force agree with a bounded intent. A mismatched response is not accepted as a successful fill.

## Dynamic rules and fresh book

The adapter retrieves exchangeInfo for the exact symbol and a current bookTicker from a fixed Binance testnet host. Public calls are unsigned and carry no API key. Missing metadata, wrong symbol, provider errors and expired observations fail closed. Rules/book collection must be at most five seconds old; the book observation must be at most two seconds old. These are local request-start times; bookTicker does not supply an exchange event timestamp. No endpoint fallback or synthetic quote is used.

Validated common filters:
- TRADING status, spot permission, LIMIT support and pair asset identity.
- PRICE_FILTER min/max/tick, respecting disabled zero-valued price rules.
- LOT_SIZE min/max/step. Quantity is rejected rather than rounded up or silently changed.
- MIN_NOTIONAL and NOTIONAL using exact rational products at the explicit limit price (market flags/average windows do not apply to this LIMIT-only path).
- MAX_POSITION includes free + locked base holdings and remaining BUY quantities for the symbol.
- Symbol/global maximum order counts, based on reconciled whole-account open orders.

Malformed, duplicated, absent required or unknown relevant filters stop admission. Filters specific to market orders, iceberg/algo orders, trailing deltas or amendments are not applied because this sender cannot create those requests.

PERCENT_PRICE and PERCENT_PRICE_BY_SIDE now use a non-null exchange reference price first. Only explicit null or documented -2043 absence permits a matching avgPriceMins average, or the latest trade for a zero-minute window. Reference request/event times must both be at most two seconds old. Failed/unsupported endpoints, unknown absence, mismatched windows and stale values still block admission; a book price is never substituted. Real provider compatibility and separate PRICE_RANGE execution rules still require validation before calling the pilot connected/ready. Account/asset-specific trading restrictions and newly introduced rules still require provider integration coverage.

## Basic server risk policy

An explicit policy contains:
- halted: rejects new admission, including when switched during an asynchronous lookup.
- dailyLossLimitQuote: explicit USDT limit requiring complete trusted daily evidence; see DAILY_RISK_AND_PAPER.md. No real evidence provider is implemented yet, so the actual testnet adapter cannot authorize new funded sends.
- Per-symbol maximum planned gross order notional (in quote asset) and maximum base position (in base units).
- Maximum whole-account open orders.
- Maximum spread and quote-relative slippage, in integer basis points. Spread is (ask-bid)/bid. BUY limit must be marketable and within the ask-relative ceiling; SELL limit must be marketable and within the bid-relative floor.

The policy's base-position ceiling includes locked units and pending same-symbol buys, not just free balance. Unverified other-symbol pending BUY exposure blocks new buys. A reducing SELL is not rejected solely because holdings already exceed the BUY position ceiling; all other applicable limits and funding checks still apply.

Max planned SELL notional is not a cap on favorable execution proceeds. Fees are excluded from the planned gross-notional figure and reserved separately. These checks do not estimate historical losses, portfolio USD value, trade profitability or safe operator-specific thresholds.

Caller intent and funding objects are copied before asynchronous lookups. Preflight completes before any new reservation is created. A validation failure sends nothing and invalidates readiness; a later attempt needs fresh account reconciliation. Existing retained request replays are status retrievals, not new submissions. No risk policy bypass is exposed through HTTP.

## Remaining work

This is not complete risk management. A persistent daily-loss evidence gate and emergency halt now exist, but their real full-history/valuation evidence provider is still missing. Native protective stop/cancel lifecycle, server worker operation, stream recovery, persistent rate limits, separate execution-price rules and real provider validation remain outstanding. Paper stop/profit-only exit logic and automatic top-ups were repaired; unified paper accounting remains pending. See DAILY_RISK_AND_PAPER.md. Do not remove the live guard because these unit tests pass.

## Validation

Tests cover rule boundaries, exact notional/rounding, stale/malformed quotes, spread and buy/sell slippage, locked/pending exposure, unsupported reference filters, halt/allowlists, no-submit on rejection, fee/principal coverage, changed-price replay, caller mutation during lookup, public-call credential omission, and partial IOC expiry. Run test:security, lint and build; these fixtures do not replace real provider validation.

Contracts checked 2026-10-20:
- https://developers.binance.com/en/docs/products/spot/filters
- https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/trade
