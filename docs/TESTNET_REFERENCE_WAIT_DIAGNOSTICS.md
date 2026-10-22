# Reference preparation wait diagnostics

A timed-out readForBook now adds streamWait to the typed freshness error or typed stream timeout:

- waitLimitMs and requiredMaxEventAgeMs: existing limits (4000 and 1000).
- waitElapsedMs: monotonic elapsed time until the timer callback ran; event-loop scheduling may make it longer than the nominal deadline.
- messagesDuringWait and referenceEventsDuringWait: increments during this read only, excluding events already cached before it began.
- bestNewEventMaxAgeMs: minimum observed upper server-age bound among nonfuture non-null events checked during this wait. Null means no such event was checked, not zero age. This measurement is taken when each event is checked, not retrospectively at timeout.

An event may arrive yet fail the preparation limit, or even fail the final 2000 ms freshness limit. A positive message count is not successful observation evidence. Null-only streams remain unavailable. Last freshness errors retain their original check-time ages; streamWait provides separate deadline context.

These additions do not alter socket lifecycle, read deadlines, reference timestamps, calibration, freshness limits, HTTP requests or execution permissions. Ordinary reads and startup diagnostics retain their previous shape. No retry or reconnect is added.

Native validation pending: the prior headroom revision passed all 393 Windows tests. Its lint result has not been supplied. The agent execution environment is offline.
