# Measured server clock for read-only decision observations

The Windows observation reported a freshly received event whose exchange timestamp was 226 ms ahead of the local wall clock. Local receipt age and exchange event age use different clocks.

Only the read-only decision observer opts into measured clock evidence. It reuses the existing public /api/v3/time request: local send and receive times bound server time at receipt between serverTime and serverTime plus the full round-trip duration. One millisecond is added at each bound for integer timestamp precision. No extra requests, reconnects, retries or timestamp rewriting are introduced.

Reference freshness requires the entire projected event-age interval to lie in [0, 2000] ms. Receipt freshness still uses its original local timestamp and the existing 2000 ms limit. Uncertainty is never subtracted from the worst-case old age. A reference that might still be in the future is rejected.

Calibration accepts a nonnegative measured round-trip duration and expires after 30 seconds. There is no separate 1000 ms cap: the full duration contributes to the event-age uncertainty interval. If that interval cannot fit entirely inside [0, 2000] ms, the reference is rejected. A monotonic clock cross-check rejects wall-clock discrepancies exceeding 5 ms during calibration and whenever the stream reads or snapshots its cache. Each decision cycle takes its own clock sample. Slow or ambiguous observations can still stop; this change does not guarantee successful cycles.

Freshness errors retain raw local event age and additionally expose serverEventAgeMinMs / serverEventAgeMaxMs when measured evidence is present. REFERENCE_CLOCK_UNCONFIRMED identifies invalid, expired or inconsistent clock measurements. These diagnostics disclose no credentials or prices.

Manual execution callers do not opt in; their existing reference checks remain in place. No execution permission, reservation, order submission, cancellation, allocation reset or automatic trading is added.

Validation on the preceding commit: operator reported 325/325 Windows tests passing. New clock tests and actual decision-watch validation remain pending on this commit; the development execution container is unavailable.

An actual run stopped at a measured 1150 ms round trip under the former 1000 ms cap. That cap has been removed; it did not follow from the 2000 ms event-age policy. Tests now cover a provably fresh 1150 ms observation, future/old interval rejection, exact 2000/2001 ms worst-case boundaries, and uncertainty wider than the freshness window. Native validation for this revision remains pending.
