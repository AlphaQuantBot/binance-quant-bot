# Trade-context freshness diagnostics

STALE_TRADE_CONTEXT now remains the same safe error code but carries typed contextTiming diagnostics:

- contextAgeMs: validation time minus context collection start.
- quoteAgeMs: validation time minus book-request start (not exchange book event age).
- beforeQuoteMs: context start to book-request start, including metadata and reference preparation.
- contextLimitMs: 5000; quoteLimitMs: 2000.
- reasons: fixed codes distinguishing CONTEXT_TOO_OLD, QUOTE_TOO_OLD, invalid timestamps, invalid start, reversed chronology, future quote request or unsafe time arithmetic.

Durations may include processing and scheduling, not just network latency. No raw timestamp, account identity, price, quantity, credential or upstream response is copied into the diagnostic object. Invalid differences serialize as null.

The exact existing freshness condition is unchanged, including acceptance at equality. No new request, retry, connection, wait or execution permission is added. Only typed TradeContextFreshnessError errors are adopted by the watcher; arbitrary thrown payloads cannot inject contextTiming. Summary persistence and history replay preserve this field while retaining compatibility with older summaries where it is absent.

The operator's latest session stopped with STALE_TRADE_CONTEXT after 26 of 60 observations, all HOLD, without gaps or duplicate candles. That prior version did not distinguish which context freshness bound was exceeded.

Validation: four tests cover exact boundaries, separate age failures, invalid timestamp diagnostics, and watch-to-SQLite roundtrip with untyped-payload rejection. Native validation pending because the agent environment is offline. Latest confirmed full suite before wait diagnostics: 393 tests; later lint/test results have not been supplied.
