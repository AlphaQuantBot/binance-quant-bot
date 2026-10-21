# Clock failure diagnostics

REFERENCE_CLOCK_UNCONFIRMED remains a stopping condition. Typed ReferenceClockError failures now expose clockDiagnostics in both decision-watch summaries and the single decision command.

reason identifies the failed check:
- INVALID_MEASUREMENT: invalid timestamp values.
- ROUND_TRIP_OUT_OF_RANGE: negative or greater-than-1000-ms clock round trip.
- MEASUREMENT_TIME_REGRESSED: local now precedes calibration receipt.
- MEASUREMENT_EXPIRED: calibration older than 30000 ms.
- CALIBRATION_CLOCK_MISMATCH: invalid monotonic duration or wall/monotonic duration discrepancy greater than 5 ms during sampling.
- CURRENT_CLOCK_MISMATCH: invalid monotonic elapsed duration or discrepancy greater than 5 ms when using the measurement.
- UNSAFE_TIME_ARITHMETIC: projected age arithmetic is not a safe integer.

Numbers: roundTripMs, measurementAgeMs, monotonicElapsedMs, wallClockDriftMs. Drift is signed wall elapsed minus monotonic elapsed. Unavailable or nonfinite values serialize as null. Calibration mismatch reports measurementAgeMs=0 because it occurs at calibration receipt. No raw epoch timestamps, credentials, price or arbitrary error text is included.

The validation order, thresholds, lack of retries, zero execution authority and terminal error behavior remain unchanged. Summaries preserve prior completed cycles when a later cycle's clock check fails.

Actual prior observation: a BUY crossing produced a locally verified bounded candidate for 0.00029 BTC at 83616.01, notional 24.2486429 USDT, with reported undiscounted fee estimate zero. No exchange validation, capital reservation or order submission occurred. A second HOLD/WAIT completed; attempt three stopped with an undifferentiated clock error. These diagnostics do not retroactively establish its cause.

Four pure diagnostic branch checks passed in the orchestration JavaScript runtime. Native TypeScript/Node tests and the next real watch run remain pending because the development execution container is unavailable.
