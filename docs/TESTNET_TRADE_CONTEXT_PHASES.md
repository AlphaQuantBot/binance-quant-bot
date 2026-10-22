# Trade-context collection phase timing

Typed STALE_TRADE_CONTEXT errors from the adapter's final context validation now include collectionPhases:

- metadataReadElapsedMs: monotonic time from context start through exchange-info reading and metadata validation.
- referenceWaitElapsedMs: monotonic time awaiting the existing stream reader before book collection.
- bookReadElapsedMs: existing monotonic book request and response handling duration.

These are client-observed elapsed durations, including scheduling and processing, not pure network latency. For legacy non-stream callers, referenceWaitElapsedMs is zero because reference and book reads overlap; bookReadElapsedMs may include that concurrent work. Values are not promised to sum exactly to the wall-clock context age.

Annotations preserve the original safe error code, age measurements and reasons. Only the typed context failure is annotated; malformed durations become null. Existing watch persistence retains the nested fields without adding exchange capability.

The preceding observed stop had contextAgeMs 6004, beforeQuoteMs 5497 and quoteAgeMs 507, proving that the 5000 ms collection bound failed while the quote bound passed. It did not identify how much pre-quote time belonged to metadata versus stream waiting.

No HTTP calls, retries, reconnects, waits, freshness limits or execution permissions change. Native validation of three new tests is pending because the agent environment is offline. Latest confirmed validation of the prior revision: Windows lint clean, 405 tests passed, two separate 60-cycle read-only sessions completed; the first was also explicitly read back by session ID.
