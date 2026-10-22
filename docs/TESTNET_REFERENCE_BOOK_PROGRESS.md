# Reference event progress during book reads

POST_BOOK_SNAPSHOT and stream CONTEXT_REFERENCE_VALIDATION freshness failures now include:

- initialServerEventAgeMaxMs: the initial accepted reference's maximum possible age at book-request start, when calibrated clock evidence is available.
- referenceEventAdvanceMs: the failing reference event timestamp minus the initially accepted event timestamp. Zero means the same event timestamp; positive means a newer event reached the cache, not necessarily a fresh one. Negative values remain diagnostic evidence of regression, never permission to accept it.

No raw event timestamp is added to error output. The failing event timestamp is retained privately in a WeakMap only for computing the difference. The original error ages, stage, phase and book duration remain intact. An invalid diagnostic clock cannot replace the original failure. No network calls, waits, retries, reconnects, freshness limits or execution paths change.

The previous observed failure had a 520.234 ms book read and a final server-event age range of 2071–2360 ms, but lacked initial event identity. It cannot establish whether the same event aged or a newer delayed event arrived.

Native validation of these changes is pending because the agent environment is offline. Previously confirmed full suite: 383 tests before the book-duration diagnostics; no native test summary was supplied yet for that diagnostic revision.
