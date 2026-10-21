# Durable read-only decision history

The watch now writes a separate decision-watch.sqlite beside the configured scoped-capital journal (default .testnet_scoped/decision-watch.sqlite). It requires the existing scoped journal and rejects a history path that aliases it. The observation log never initializes, resets or edits scoped capital.

SQLite uses WAL, synchronous=FULL, foreign keys and a zero busy timeout. Before the first observation, a UUID session with requested count is committed. Each validated cycle is committed before console emission and before the core counts it as completed. Exact cycle replays are idempotent; revisions, gaps, writes after finalization and execution-capable reports are rejected.

A final summary is recomputed against committed reports. Only after its transaction commits does the CLI print persistedSession=true and sessionId. On a write failure the watcher stops; a failed write is not counted, printed or followed by another observation. Final-summary failure cannot print a successful persisted summary.

An abrupt exit can leave committed reports without a final summary. History reports such sessions as UNFINALIZED, with the actual committed count and persistedSession=false (no final summary). It does not guess whether another process is alive, claim completion, automatically finalize or resume the session. A later command creates a different session ID.

Commands:
- npm.cmd run testnet:decision-watch -- 3
- npm.cmd run testnet:decision-history (latest five session summaries)
- npm.cmd run testnet:decision-history -- 10 (latest ten; bound 1–20)
- npm.cmd run testnet:decision-history -- SESSION_UUID (summary plus stored cycle reports)

The history command opens existing storage read-only, needs no API keys and has no network/exchange capability. It cannot create missing storage or alter session status. Reports include the decision fields already printed by the watch; no API keys are stored. Incomplete or corrupt storage yields a safe failure code.

This is durable diagnostic evidence, not execution authority or strategy-performance evidence. The core can still be used without a recorder and then reports persistedSession=false. Clock/reference freshness, fail-closed behavior and all automatic-trading restrictions remain unchanged. Stop/Ctrl+C summaries are persisted when storage remains writable. A crash during an observation may leave that attempt unrecorded; only committed completed observations are counted.

Keep the SQLite file and any WAL/SHM companions together when backing up a stopped process. The default directory is already excluded from Git. No new dependency is required.

Tests added: reopen with final summary; exact replay/revision handling; unfinalized sessions across restart; unsafe reports/inconsistent summaries; actual SQLite writer contention stopping further work; committed observation surviving abrupt child exit; and read-only history without file creation or exchange capability.

The preceding application revision passed operator Windows lint and 354 tests and completed a ten-cycle actual read-only watch. Those results do not validate this new persistence change. Native tests for this revision remain pending because the development container is offline.
