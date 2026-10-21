# Safe decision-observation error codes

Known fixed stream, read-provider, account-schema and context-validation error codes now pass through the decision CLI/watch error mapper. In particular, STREAM_REFERENCE_TRANSPORT_UNCONFIRMED, STREAM_REFERENCE_INVALID, EXCHANGE_TRANSPORT_UNKNOWN, EXCHANGE_REQUEST_UNCONFIRMED and STALE_TRADE_CONTEXT are distinguishable.

The mapper is an independent pure module, re-exported from scopedDecisionObservation to preserve both CLI interfaces. It uses exact membership in a fixed list, not a prefix or uppercase-message regex. Unknown errors, arbitrary provider strings, stack traces, paths, payloads and decorated known codes remain DECISION_OBSERVATION_UNCONFIRMED. No response bodies or credentials are output.

No exception is suppressed or treated as success. Stopping behavior, freshness limits, account checks, zero execution authority and request counts remain unchanged. The previously reported generic failure cannot be identified retroactively.

Verification: 53 known-code checks and four rejection checks passed in the orchestration JavaScript runtime. Native Node tests and a fresh operator observation are pending because the development execution container is unavailable.
