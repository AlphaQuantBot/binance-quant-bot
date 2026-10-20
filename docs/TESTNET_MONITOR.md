# Read-only testnet account monitor

`npm run testnet:watch` is an explicitly launched foreground process. It is not
started by the web server or by this development session. Set independent testnet
keys, APP_TESTNET_MONITOR_CONFIG to a local JSON file, and
APP_TESTNET_WATCH_CYCLES to a positive cycle count or explicitly 0 for continuous
observation. The process never places, cancels or replaces exchange orders.

Example configuration (choose the intended startTime in Unix milliseconds):

```json
{
  "symbols": ["BTCUSDT"],
  "startTime": 1792411200000,
  "intervalMs": 60000,
  "settlementLagMs": 60000,
  "windowMs": 900000,
  "maxWindowsPerCycle": 1
}
```

Symbols must be explicit and unique (maximum ten). Poll delay is 30–60 seconds
after the previous cycle finishes; cycles never overlap. Settlement lag is
30 seconds–one hour. Recovery windows are at most 15 minutes, with at most two
symbol windows attempted per cycle (default example one). Each symbol gets at
most one window per cycle, round-robin. Lag is an observation delay, not proof that
exchange history visibility is final. Existing backfill request/trade bounds and
429 cooldown remain in force; no universal request-weight scheduler is claimed.

Each cycle first attempts current account valuation and writes a separate equity
observation journal. Valuation failures are reported as unconfirmed. Local journal
write/validation failures stop the process rather than silently discarding data.
Timed interval reconciliation receives the first recovery slot when pending; historical backlog scanning uses the remaining per-cycle budget. Backlog scanning uses a persisted per-symbol nextTime and active scope.
Active scope is fsynced before any network read; restart retries the same exact
bounds even when wall time advances. Only matching stable symbol/window/account
results advance the cursor to endTime+1. Failed, changing or conflicted windows
remain pending; other symbols can still be checked. Recent times beyond the
settlement-lag cutoff are deferred. Clock regression and changed/corrupt persisted
configuration fail closed. Existing stale locks require deliberate manual recovery.

Default private files (all ignored by git, including lock/temp files):
- .testnet_monitor_state.json — durable scheduler cursor/config
- .testnet_monitor_equity.json — separate equity observations
- .testnet_history_recovery.json — shared scoped recovery journal
- .testnet_monitor_intervals.json — fixed balance-checkpoint pairs and scoped interval audits

Override with APP_TESTNET_MONITOR_STATE, APP_TESTNET_MONITOR_EQUITY and
APP_TESTNET_RECOVERY_JOURNAL; APP_TESTNET_MONITOR_INTERVALS selects the interval journal. All instances for the same workload must share paths;
arbitrarily different journals do not give account-wide process exclusion. The
separate monitor-equity file avoids erasing diagnostic activity cursors maintained
by testnet:activity. Do not point it at that activity file.

SIGINT/SIGTERM abort active HTTP requests and timer waits, then release process
locks after in-flight work exits. Failed scopes remain pending on disk. A finite
run exits nonzero if a cycle sees unconfirmed valuation/recovery; zero means only
that the requested read cycles completed without those failures. For a first
configured testnet check use one cycle before continuous operation.

This is a REST observation/recovery worker, not an order engine, service deployment
or WebSocket consumer. Cursors describe only configured symbol enumeration. It
does not establish atomic full-account event coverage, discover
all account symbols, resolve testnet resets, backfill midnight baseline/flows,
clear account history gaps or create daily-risk evidence. Reports retain
accountGapClosed:false and dailyRiskAuthorized:false. Actual configured testnet
execution has not occurred in this session; fixtures validate scheduling/restart
and failure behavior without network requests or real credentials.


## Bind observed balances to scoped recovered fills

The observer now retains a first complete balance checkpoint, then freezes the
next complete checkpoint as a pending pair. Later observations still enter the
equity journal but do not overwrite this pair. After settlement lag, at most one
configured symbol is recovered for the fixed interval per cycle. This consumes
one shared recovery slot before backlog work, avoiding starvation at a one-window
cycle budget. A completed cached set is finalized without another read after a
crash between report persistence and audit finalization.

Recovered history must cover from the first checkpoint's REST read start through
the second checkpoint's read completion. Trades during either checkpoint's read
window are BOUNDARY_ACTIVITY_AMBIGUOUS: REST reads cannot determine on which side
of the balance boundary a fill appeared. A valid interior interval compares exact
BUY/SELL and native fee deltas against all observed free+locked balance changes.
Nonzero holdings outside the configured pair assets are UNMONITORED_HOLDINGS.
Residual differences are UNEXPLAINED_INTERVAL_CHANGE. Missing/unconfirmed symbol
history never advances the baseline. More than 24 hours between checkpoints
requires review rather than pretending one supported API window covers it.

Only MATCHED_SCOPED_INTERVAL advances the checkpoint to the already frozen second
observation. Ambiguous/unmonitored/unexplained results freeze the interval for
review across restart. No automatic reset/resume endpoint is supplied. Saved
blocked audits are recomputed from retained balances/trades on load; stored
"success" text cannot authorize advancement. Checkpoints use normalized balances
and account-bound digests. This compact journal retains the current checkpoint
pair and latest audit; it is not an append-only complete historical event log.

This associates diagnostic recovered fills (including manual fills on configured
symbols) with observed native changes, without adopting local bot orders or
clearing unknown orders/equity history gaps. Two equal history reads may still
omit late records. A net match cannot rule out offsetting unseen activity or
trades on unconfigured pairs with zero final holdings. All results therefore keep
accountGapClosed:false and dailyRiskAuthorized:false. Full account symbol
discovery, event replay/reset detection and real end-to-end Testnet validation
remain outstanding.
