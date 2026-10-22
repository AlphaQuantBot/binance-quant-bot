# Reference preparation headroom

Read-only decision observation now calls TestnetReferenceStream.readForBook before the existing book request. It accepts only a reference whose maximum possible server-event age is at most 1000 ms, reserving 1000 ms of the unchanged 2000 ms final window. This is a fixed preparation policy, not a measured book latency forecast or a promise that collection will finish in time.

The existing four-second read deadline remains. The existing socket may deliver new real events during that deadline; no network retry, reconnect, additional HTTP request or REST fallback is introduced. Original event and receipt timestamps are preserved. Calibrated reads use the oldest possible event age, not the midpoint or local wall-clock age.

Snapshot and final validation still require the entire event-age interval to be within 0–2000 ms. Ordinary stream reads, startup warmup and manual execution callers retain their previous freshness rules. A slow book read or a stalled feed can still stop the session. Preparation timeouts with no valid headroom include requiredMaxEventAgeMs: 1000 in their typed stream diagnostics. An actual stale event still yields the original freshness error.

Operator evidence motivating this change: the same reference event began the book request with maximum possible age 1817 ms, then a roughly 309 ms book read left its maximum age at 2127 ms. The former preparation accepted this event with only 183 ms remaining.

Native lint and tests are pending; the agent environment is offline. The latest confirmed full suite remains 383 tests before diagnostic additions. No trading authorization is added.
