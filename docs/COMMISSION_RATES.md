# Read-only testnet commission audit

`npm run testnet:commission` requires independent APP_TESTNET_API_KEY,
APP_TESTNET_SECRET_KEY and explicit APP_TESTNET_COMMISSION_SYMBOL (for example
BTCUSDT). It performs one signed GET to `/api/v3/account/commission` on the fixed
Spot Testnet host. This endpoint reads current account/symbol rates; no order is
placed, canceled or replaced. Unsupported testnet responses fail without a
production-host fallback or invented zero/default commission.

The normalizer requires all standard, special and tax maker/taker/buyer/seller
rates as exact decimal strings, symbol/account identity and valid discount flags.
Observation freshness is two seconds from request start. Negative rebate rates,
individual rates above one and composite rates above one are explicitly unsupported.
A zero rate is accepted only when supplied by the provider. Buy/sell maker/taker
summaries add liquidity and side components across all three groups. Discount
metadata is retained but not applied: there is no assumption of available BNB,
conversion pricing or guaranteed discount eligibility at execution.

This is current rate observation, not a realized commission amount or a future
GTC execution cost bound. `reservationAuthorized:false` remains explicit.
Actual paid fees still come from reconciled trades. No `stopFeeEvidence` provider
is auto-enabled from this snapshot: future execution prices, native fee asset,
rate changes and BNB conversion/availability require a separate reservation policy.
The full-day account historian/valuator is also still absent. Thus this change does
not enable the replacement coordinator or live execution.

Tests use synthetic responses with a fake transport. No real account credentials
or exchange requests were used in development. Validate the configured testnet
endpoint before relying on its availability.

Official schema:
https://developers.binance.com/en/docs/catalog/core-trading-spot-trading/api/rest-api/account
