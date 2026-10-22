# Measured reference preparation budget

Read-only decision sessions now retain the last eight completed book-read durations in memory. Before each book request, reserveMs is the ceiling of the maximum retained duration plus 250 ms, bounded to 500–1999 ms. Before any measurement it remains 1000 ms. The initial reference must have maximum possible server-event age at most 2000 minus reserveMs.

This estimate is a preparation policy, not a prediction or execution guarantee. The maximum of retained observations may cease to represent future latency. Older samples leave the window; process restart clears measurements. The existing final 0–2000 ms full-interval requirement remains authoritative, as do the 5000 ms context collection and 2000 ms quote-request age bounds.

Only the read-only decision observer supplies the adapter's optional onBookRead callback. The callback records the existing book request's monotonic elapsed duration, including response handling and scheduling. It adds no requests. Successful reports include referenceBookBudget with sampleCount, maxObservedBookReadMs, nextReserveMs and marginMs. nextReserveMs is the next read's budget, not a claim about the budget used earlier in the report.

The four-second preparation deadline is unchanged. No reconnect, retry, REST fallback, timestamp replacement, order submission or allocation reset is added. Ordinary stream reads retain their previous behavior.

Operator evidence: a preparation wait received two reference events but the best upper age bound was 1057 ms, missing the former fixed 1000 ms preparation threshold by 57 ms. This was not a failure of the final 2000 ms requirement. A measured reserve may admit such an event when prior completed book reads leave enough modeled preparation room; final validation can still reject it.

Validation pending: the prior revision passed 400 Windows tests; lint result has not been supplied. Five tests cover cold start, rolling bounds, invalid samples, unchanged final rejection, and adapter measurement without additional HTTP requests. The agent environment is offline.
