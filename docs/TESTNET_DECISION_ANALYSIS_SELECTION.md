# Analyze explicit decision session IDs

The recent-history command retains its 1–20 session bound:

```powershell
npm.cmd run testnet:decision-analysis -- 20
```

For an entire monitor run, supply its childSessionIds as one comma-separated argument:

```text
npm.cmd run testnet:decision-analysis -- ids UUID1,UUID2,UUID3
```

Explicit selection accepts 1–120 distinct canonical lowercase UUIDs. All IDs are validated before storage access. Every requested session must exist; one missing session fails the operation without partial output or fallback to recent data. Reads use one existing read-only SQLite connection and transaction. No account API or network is available in this path.

The existing per-session summary recomputation and report validation remain. All selected observations are checked for signal revisions, unsafe authority flags and conflicting candle history before aggregation. The explicit analysis bound is 120 sessions; ordinary recent analysis remains capped at 20. Output includes selectedSessionIds and allSelectedSessionsFound true only after successful validation.

This is an explicit selection, not proof that IDs belong to a persisted parent group: the monitor's parent summary is not stored. Use the exact childSessionIds from its console output. Failed child sessions with zero observations count as failed sessions, never as candles or HOLD signals.

Native validation pending for four added tests because the agent environment is offline. Tests cover 37 selected children including an early candidate and final failure, missing ID rejection, bounds/duplicates/no missing-file creation, and corrupt-summary rejection. The early candidate is synthetic test evidence only, not an operator-observed BUY.
