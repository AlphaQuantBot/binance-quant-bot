# Observed equity history and explicit coverage gaps

`npm run testnet:equity-record` collects a fresh read-only account valuation and
records one observation in a private, atomically replaced/fsynced journal. Set the
independent testnet credentials and optionally APP_TESTNET_EQUITY_HISTORY; the
default is .testnet_equity_history.json (ignored by git, including lock/temp files).
An exclusive process lock prevents two writers. Corruption/account mismatch is
an error, never a reason to replace the original baseline with a fresh balance.

Each UTC day retains its first *observed* equity/time and latest equity/time,
observation count, maximum within-day observation gap and latest native balances.
Restart preserves the original baseline and flags interrupted observation.
Incomplete valuations, stale samples, mismatched balance digests, duplicate or
regressing clocks are rejected before recording. A new UTC day starts a new
FIRST_OBSERVATION baseline, without claiming it is an exact midnight observation.
Daily summaries are retained; maximum gap is within a day, not proof of continuous
coverage across UTC day boundaries. Each CLI invocation is one observation, not a
scheduled worker; subsequent invocations correctly mark a process restart.

Raw signed equity change since the first observation and native balance changes
since the preceding observation are diagnostics. They are NOT profit, deposits,
withdrawals or classified transfers. Balance change could reflect fills, fees,
reset, grant or missing activity. The record always outputs dailyPnlUSDT:null,
externalInflowsUSDT:null, externalOutflowsUSDT:null, coverageComplete:false and
dailyRiskAuthorized:false. It never silently supplies zero flows to DailyRiskGate.

Binance's Spot Testnet general information says only /api endpoints are available,
/sapi endpoints are unavailable, and test funds are virtual/non-transferable.
Therefore production wallet deposit/withdrawal endpoints must not be presumed
available on testnet or used as a fallback production connection. Testnet resets
and missing observations still require explicit reconciliation. A daily-risk
producer needs full exchange event/trade coverage and gap/reset detection plus an
appropriate testnet flow model; this observation journal does not supply that.

Actual configured testnet observation has not been performed in this session.
Tests verify persistence, native decimal changes, restart/day rollover, invalid
input, stale/clock regression, process locks and corrupt storage using fixtures.
No exchange order operation is exposed by this command.

Official Testnet limitations:
https://developers.binance.com/en/docs/products/spot/testnet/general-info
