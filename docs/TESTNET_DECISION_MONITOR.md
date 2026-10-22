# Bounded decision monitor with explicit unavailable cycles

This is an opt-in command; the existing decision-watch still stops at the first failure.

```powershell
npm.cmd run testnet:decision-monitor -- 10
```

The explicit limit is 1–120 attempts. Each attempt runs the existing single-cycle watcher and existing read-only observer. It uses the same persistent reference socket and measured preparation budget. After an observed or eligible unavailable cycle it schedules the next attempt no sooner than 60 seconds after the previous attempt started. This polling schedule is not server-minute alignment. A long attempt is never backfilled and no within-attempt retry occurs.

Only typed reference stream timeouts and typed stale-reference failures with nonfuture, valid age evidence qualify as UNAVAILABLE. These represent no accepted observation. Connection errors/close, malformed or regressing stream data, future reference evidence, failed clock calibration, stale trade context, account problems, unsafe reports and storage failures still stop the monitor. Operator interruption remains terminal. No reconnect or REST substitution is introduced.

Persistence uses existing decision-watch.sqlite. Every attempt creates a separate child session with requestedCycles 1. An unavailable attempt is stored as STOPPED with the original safe code and zero completed observations, not rewritten as a successful observation. The child is committed before cycle output or a later attempt. Its ID appears in childSessionIds and can be read with decision-history -- ID.

The outer summary reports observedCycles and unavailableCycles separately. COMPLETED_WITH_UNAVAILABLE_CYCLES means the attempt budget finished with missing observations; it does not claim continuous coverage. persistedCycles true means each listed child was committed. persistedSession false explicitly means the outer grouping/summary is not stored as a separate session. An abrupt exit may leave the last child UNFINALIZED; no resume or automatic reclassification occurs. Existing history/analysis treats each child as its own session, so session counts from monitor runs must not be compared directly with earlier multi-cycle watch runs.

There is no fabricated HOLD, candidate, candle or backfilled observation for an unavailable cycle. This command does not measure PnL or authorize execution. The same 2000 ms reference, 5000 ms context and 2000 ms quote bounds remain; the consumed one-shot execution policy is untouched. Run only one operator observation command at a time.

Motivation: independent five- and ten-minute public probes found >4-second client arrival gaps, with maxima around 6 and 10 seconds. Those measurements support representing unavailable reads honestly; they do not prove whether publication, network or client scheduling caused them.

Validation pending for six new tests because the agent environment is offline. Tests cover nonfatal scheduling, typed error classification, real SQLite child-session replay, failed persistence, interruption and unsafe-report rejection. Previous supplied validation: prior lint clean, cadence probe 4/4 tests and actual five/ten-minute runs; the latest supplied full suite was 415 tests before the probe.
