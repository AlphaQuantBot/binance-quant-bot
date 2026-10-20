# Actual Testnet connectivity attempt

Observed UTC time: **2026-10-20T22:31:40.497000+00:00**.

The direct real-network probes to https://testnet.binance.vision/api/v3/ping,
/api/v3/time and /api/v3/exchangeInfo?symbol=BTCUSDT each returned HTTP 451.
The exchange response explained that service is unavailable from the restricted
location of this execution environment. A second HTTP client confirmed 451 for
ping/time. These are real HTTP results, not transport fixtures. No authenticated
account request, order submission, cancellation or replacement was performed.

The actual preflight command was then run. It stopped at the first blocked public
check. Its subsequent SKIPPED fields below mean no further requests were made by
that command; they do not contradict the separate initial direct probes.

```json
{
  "environment": "BINANCE_TESTNET",
  "observedAt": 1792535500497,
  "symbol": "BTCUSDT",
  "credentialsConfigured": false,
  "checks": [
    {
      "name": "ping",
      "state": "BLOCKED",
      "code": "EXCHANGE_LOCATION_RESTRICTED",
      "httpStatus": 451
    },
    {
      "name": "time",
      "state": "SKIPPED",
      "code": "PUBLIC_PREFLIGHT_FAILED"
    },
    {
      "name": "exchangeInfo",
      "state": "SKIPPED",
      "code": "PUBLIC_PREFLIGHT_FAILED"
    },
    {
      "name": "account",
      "state": "SKIPPED",
      "code": "PUBLIC_PREFLIGHT_FAILED"
    },
    {
      "name": "commission",
      "state": "SKIPPED",
      "code": "PUBLIC_PREFLIGHT_FAILED"
    }
  ],
  "publicReady": false,
  "authenticatedReady": false,
  "tradingEnabled": false
}
```

Environment inspection found no APP_TESTNET_API_KEY or APP_TESTNET_SECRET_KEY,
no local private .env configuration (only .env.example), and no testnet account
journals. No secret values were printed or placed in this report.

## Result and implementation changes

The real account/trading test is **blocked, not passed**. Public API access from
this host is restricted, and independent testnet credentials are not configured.
There is no evidence yet about actual account balances, exchange permissions,
real fills, stop lifecycle or continuous operation. No live routes were enabled.

Added `npm run testnet:preflight`, a fixed-host read-only command. It checks ping,
server time/clock and an explicit/default BTCUSDT symbol. If public checks pass
and independent testnet credentials are present in private runtime variables, it
checks account snapshot and current commission reads. It never creates an order.
HTTP 451 is now separately named EXCHANGE_LOCATION_RESTRICTED in the adapter.
Errors are sanitized, public checks never include secret headers, and readiness
results distinguish public from authenticated access. No production-host fallback
is attempted. Test symbol override: APP_TESTNET_PREFLIGHT_SYMBOL.

## Next real-test requirement

Run the branch on an environment permitted by Binance's service restrictions.
Configure APP_TESTNET_API_KEY and APP_TESTNET_SECRET_KEY privately in that runtime,
using independent Spot Testnet credentials, then run `npm run testnet:preflight`.
Do not paste credentials into chat, logs, source files or GitHub. Share the
sanitized preflight result to continue account-level diagnostics. Public/read
preflight success does not bypass the still-incomplete trading/risk gates.

Local regression validation after these diagnostic changes: **208 fixture tests
passed**, TypeScript and production build passed. This is separate from the
blocked actual-network result above.

## Operator-run Windows follow-up

The operator subsequently ran the actual preflight on their own Windows runtime.
Public ping, time and BTCUSDT exchangeInfo returned HTTP 200/PASS. After independent
testnet keys were privately configured, credentialsConfigured became true, but the
account check failed with AUTHENTICATED_READ_UNCONFIRMED and commission was skipped.
This is evidence of public connectivity and a failed account check, not proof of
invalid keys or successful authenticated account validation. No exchange write ran.

The former preflight collapsed account-schema/consistency failures into a generic
code. It now exposes only allowlisted internal diagnostic codes, including missing
SPOT metadata, malformed decimal/balance data and changing snapshots. Account
field checks are distinguished without weakening validation. Raw response bodies,
keys, account balances and arbitrary exception text remain excluded from the
report. The operator must pull this update and rerun preflight in the same keyed
PowerShell session before diagnosing the root cause. Local regression: 210 fixture
tests, TypeScript and production build passed. The account failure is unresolved
until the updated actual output is collected.


### Unicode balance compatibility follow-up

The operator's next actual run narrowed the account failure to
`INVALID_BALANCE_ASSET`. Binance's official testnet changelog (2025-12-18)
documents Unicode asset `这是测试币` and numeric asset `456` distributed to all
accounts: https://github.com/binance/binance-spot-api-docs/blob/master/testnet/CHANGELOG.md
The balance reader previously accepted ASCII uppercase identifiers only. It now
accepts Unicode letters/numbers/combining marks within the existing 24-character
limit, preserving names and balances exactly. Duplicate names, malformed amounts,
whitespace/control characters and unsupported identifiers still fail validation.
No balances are dropped or assigned invented prices. Execution symbol policies
are unchanged; account-read success does not authorize trading or pricing these
assets. The exact offending identifier was not disclosed by the operator.

Pull and rerun `npm.cmd run testnet:preflight` in the same keyed PowerShell.
Actual authenticated readiness remains unconfirmed until that result is returned.


### Actual authenticated account confirmed; commission still blocked

Operator run after 4802496 confirms account PASS/AUTHENTICATED_READ_CONFIRMED.
Commission failed INVALID_COMMISSION_DISCOUNT; its exact rejected field is not
known. Do not infer an invalid key or assume a discount asset/rate. Commission
validation now reports separate allowlisted codes for absent metadata, invalid
flags, missing/non-string/unsupported asset names, and unsupported rates. No raw
response or private values are printed, and validation has not been relaxed.
Pull and repeat preflight in the same keyed PowerShell to identify the field.
No trading readiness or order submission has been confirmed.
