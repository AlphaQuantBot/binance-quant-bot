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

## Match known trade activity to native balance changes

`npm run testnet:activity` requires an existing testnet order journal in addition
to the independent testnet credentials. It takes the same equity-history lock,
queries retained orders read-only, obtains explicit symbol/base/quote identities,
collects account valuation and queries retained orders again. Changing execution
snapshots abort the observation. Submission is unavailable to this command and
no cancel capability is passed to its order journal. Read reconciliation updates
the existing private order journal, not exchange orders.

Validated cumulative trade IDs and native fee records are retained alongside the
balance observation. For trades added since the last activity baseline, BUY adds
base/subtracts quote, SELL subtracts base/adds quote, and commission subtracts its
own native asset. Free/locked movements with unchanged totals are not cash flows.
Trade IDs are scoped by symbol; old trades are not applied twice. Changed/removed
historical trades, invalid settlement/pair identity or duplicate trades fail closed.
Unknown orders/missing settlements produce UNRESOLVED_ORDERS. Other native balance
differences produce UNEXPLAINED_BALANCE_CHANGE, not guessed deposits or resets.

The first activity snapshot is ACTIVITY_BASELINE_ONLY. Running the simpler
`testnet:equity-record` without activity clears the activity cursor so a later
activity run must establish a new baseline; it cannot compare trades across that
gap. Existing version-one observations without a cursor remain valid equity
history and likewise require an activity baseline. Restart retains trade cursors.
Unresolved/unexplained states are latched in that UTC day's activityIssues even if
a later interval matches. Such issues produce nonzero CLI exit. New days keep a
new daily issue list without pretending old gaps were retrospectively explained.

MATCHED_KNOWN_ACTIVITY means only that observed net native changes match trades
in the retained local order journal for this interval. It does NOT discover all
manual/other-bot orders or prove absence of offsetting unobserved transfers/trades.
REST bracketing is not atomic. Late fill/fee visibility may cause a safe residual
failure. A testnet reset cannot be identified conclusively from a balance drop.
Full-account event/backfill coverage and reset detection remain outstanding;
dailyRiskAuthorized is still false and no DailyRiskEvidence is manufactured.

Fixture tests cover BUY/SELL movements, base/quote/third-asset commissions,
free/locked changes, unexplained gains/losses, duplicate/removed trades, unknown
orders, persisted cursors and retained diagnostic gaps. Actual testnet validation
has not been performed in this development session.
