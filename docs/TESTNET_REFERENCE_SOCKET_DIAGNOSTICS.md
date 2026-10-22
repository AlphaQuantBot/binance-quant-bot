# Socket state during a silent reference wait

Preparation wait diagnostics now include socketReadyState and lastMessageAgeMs.

socketReadyState is the client WebSocket API state at deadline: 0 connecting, 1 open, 2 closing, 3 closed. Missing, invalid or unreadable state is null. State 1 does not prove end-to-end transport health, server publication health or heartbeat delivery; a half-open connection can still appear open. No definitive network-vs-provider cause can be inferred from it alone.

lastMessageAgeMs is monotonic elapsed time since the latest delivered message event, including idle time before this preparation wait. It is null when no message has been seen or the elapsed measurement is invalid. Null-price messages update transport activity but never supply a usable price. This duration is not an exchange event age.

Actual error and close events still fail immediately with their existing codes. These diagnostic fields apply when the existing preparation timer fires; they add no ping, network request, reconnect, fallback or retry. The four-second deadline and all freshness limits remain unchanged.

The last operator session stopped after six of 120 observations with zero messages during its reference wait. Existing counters established local silence but did not reveal client socket state or total idle duration. These new fields narrow that observation without claiming to establish root cause.

Validation pending for three added tests because the agent environment is offline. Prior revision confirmed: Windows lint clean and all 408 tests passed. The added tests cover reported states, unknown state/no messages and null-message transport activity.
