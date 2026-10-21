# Freshness failure stage diagnostics

Typed STALE_REFERENCE_PRICE errors in read-only decision observations retain their original age evidence and add fixed labels under referenceTiming.

stage:
- INITIAL_STREAM_READ: the first asynchronous stream read in tradeContext failed.
- POST_BOOK_SNAPSHOT: selecting the cached stream event after bookTicker completed failed.
- CONTEXT_REFERENCE_VALIDATION: final context/reference validation failed.

phase:
- ACCOUNT_OBSERVATION: initial account/context observation.
- CANDIDATE_REVIEW: context refresh or local review after a candidate was found.

The first attached stage and phase are preserved; outer handling cannot overwrite them. Only typed freshness errors are annotated. No request retries, waits, age-limit changes, timestamp changes, or execution authority are added. These labels identify the failing check, not the root cause of network latency.

Actual prior observation: four contiguous HOLD/WAIT cycles, then a stale-reference stop with server event-age interval [1168, 2136] ms. Its upper bound exceeded the policy by 136 ms. That historical output cannot establish the failing stage retroactively.

Tests cover the three adapter stages and unchanged request counts, age preservation, phase preservation and untyped-error handling. Native Node verification remains pending because the development execution container is unavailable.
