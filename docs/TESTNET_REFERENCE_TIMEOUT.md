# Reference stream timeout diagnostics

READ_ONLY_DECISION_WATCH_SUMMARY and the single decision command include streamDiagnostics on a typed STREAM_REFERENCE_TIMEOUT:

- opened: whether this subscription emitted an open event.
- messages: message events received before stopping.
- referenceEvents: matching reference-price messages with valid identity and timestamp.
- nullPrices: matching messages explicitly carrying null.
- nonNullPrices: matching messages with a positive decimal price; this count does not imply freshness.
- waitLimitMs: existing read deadline, 4000 ms.

Counters cover the current cycle's subscription, including messages before read() begins. The timeout snapshots counters before cleanup; closing the socket does not alter that snapshot. No raw payloads, prices, credentials, arbitrary error strings or paths are exposed. A null message still clears cached price availability.

opened=false and messages=0 means no open event was observed by the deadline. opened=true with messages=0 identifies an opened but silent subscription. Null counts distinguish unavailable price messages from silence. These are observations, not proof of a provider-side root cause.

No retry, reconnect, timeout extension or execution capability is added. Freshness errors retain their existing referenceTiming; transport and malformed-message failures retain existing behavior.

Observed before this change: two HOLD/WAIT cycles completed, then the third stopped with STREAM_REFERENCE_TIMEOUT. The two observed candles were contiguous; the requested three-cycle session did not complete.

New tests cover the three timeout conditions, a price followed by explicit null, partial session counts, and rejection of arbitrary diagnostic payloads. Native Node execution remains to be verified on Windows.
