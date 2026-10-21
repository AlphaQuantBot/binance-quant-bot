# Reference book-read diagnostics

Typed STALE_REFERENCE_PRICE errors now include clockUncertaintyMs when calibrated server-event bounds exist. This is the full interval width (maximum minus minimum), not a measured network delay or an assertion about one-way latency.

POST_BOOK_SNAPSHOT and stream CONTEXT_REFERENCE_VALIDATION failures also include bookReadElapsedMs, measured with performance.now around the existing book request and response handling. It includes client processing and scheduling; it is not pure network latency. Invalid durations become null. INITIAL_STREAM_READ errors have no book duration because the book request has not started.

These fields only explain failures. Event and receipt timestamps, the 2000 ms full-interval freshness condition, wait deadlines, HTTP request counts, retry policy, and execution authority are unchanged. No connection restart or REST fallback is added.

Operator evidence before this change: two requested 60-cycle sessions stopped after 19 and 13 completed observations. The second stop occurred after book collection with server-event age interval 1628–2220 ms. The interval width was 592 ms; book duration was not measured in that older version, so its causal contribution is unknown.

Validation: the prior period-comparison revision passed Windows lint and all 383 tests. The added diagnostic tests and strengthened existing adapter fixture require native validation. The agent execution environment remains offline.
