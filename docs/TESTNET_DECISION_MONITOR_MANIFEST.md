# Durable decision monitor groups

New decision-monitor runs commit a monitorId before any observation. Each child session and its ordered parent link are created in one SQLite transaction. After the child summary is committed, its OBSERVED, UNAVAILABLE or terminal status is committed to the parent mapping before console output or the next cycle.

The final parent summary is committed only after its counters, ordered child IDs, status classifications, limits and authority flags match persisted children. New final summaries report monitorId and persistedSession true. The existing monitoring schedule, nonfatal classification rules, price freshness checks and disabled execution authority do not change.

Analyze a new run by its printed monitorId:

```text
npm.cmd run testnet:decision-analysis -- monitor MONITOR_UUID
```

The reader uses existing storage in read-only mode. It validates the manifest, revalidates each selected child with the existing summary recomputation, and verifies final counters against those children. A finalized parent cannot add more children. Invalid, missing or corrupt records fail rather than yielding partial success.

A process exit before final parent commit leaves UNFINALIZED, including any pending child. Child summary and parent status use separate commits: a crash between them leaves a pending parent mapping and is never silently classified or completed. There is no automatic resume. Readout of an unfinished group is evidence of committed children only and does not prove a process has terminated.

Parent mapping and immutable finalized children are read and revalidated in separate read-only snapshots. Active unfinished groups may advance between snapshots; their parent remains explicitly UNFINALIZED. This is not a claim of a single atomic live snapshot.

Older runs have no stored monitorId and are not retroactively grouped. Their existing child records and explicit-ID analysis remain available. Existing recent-history bounds remain unchanged. Schema changes add two tables to decision-watch.sqlite without modifying capital storage.

Native lint and four tests are pending because the agent environment is offline. Tests cover final reopen and analysis, unfinished parent/pending child, inconsistent counters/corruption, and cross-parent/missing-file rejection. Latest operator-confirmed prior validation: 429 full-suite tests and clean lint, plus exact analysis of 37 selected records.
