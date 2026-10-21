# Measured server clock for read-only decision observations

The Windows observation reported a freshly received event whose exchange timestamp was 226 ms ahead of the local wall clock. Local receipt age and exchange event age use different clocks.

Only the read-only decision observer opts into measured clock evidence. It reuses the existing public /api/v3/time request: local send and receive times bound server time at receipt between serverTime and serverTime plus the full round-trip duration. One millisecond is added at each bound for integer timestamp precision. No extra requests, reconnects, retries or timestamp rewriting are introduced.

Reference freshness requires the entire projected event-age interval to lie in [0, 2000] ms. Receipt freshness still uses its original local timestamp and the existing 2000 ms limit. Uncertainty is never subtracted from the worst-case old age. A reference that might still be in the future is rejected.

Calibration requires round-trip duration <= 1000 ms and expires after 30 seconds. A monotonic clock cross-check rejects wall-clock discrepancies exceeding 5 ms during calibration and whenever the stream reads or snapshots its cache. Each decision cycle takes its own clock sample. Slow or ambiguous observations can still stop; this change does not guarantee successful cycles.

Freshness errors retain raw local event age and additionally expose serverEventAgeMinMs / serverEventAgeMaxMs when measured evidence is present. REFERENCE_CLOCK_UNCONFIRMED identifies invalid, expired or inconsistent clock measurements. These diagnostics disclose no credentials or prices.

Manual execution callers do not opt in; their existing reference checks remain in place. No execution permission, reservation, order submission, cancellation, allocation reset or automatic trading is added.

Validation on the preceding commit: operator reported 325/325 Windows tests passing. New clock tests and actual decision-watch validation remain pending on this commit; the development execution container is unavailable.
