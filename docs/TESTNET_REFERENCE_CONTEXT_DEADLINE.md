# Context-bounded reference preparation

Read-only decision observation now limits reference preparation to min(4000, 5000 - elapsedContextMs - bookReserveMs). The context start is the adapter's original timestamp before metadata collection. It is passed to the optional reference reader; existing one-argument readers remain compatible.

If less than one millisecond remains after reserving book time, the safe code TRADE_CONTEXT_BUDGET_EXHAUSTED stops before the book request. Otherwise readForBook uses the reduced deadline and includes that actual deadline in existing timeout diagnostics. No waiting period is extended and no retry is introduced. The measured book reserve and reference age threshold are unchanged.

This is an early-stop policy, not an availability fix or a guarantee of completion. A delayed timer, event-loop scheduling or a slow book response may still exceed the original deadline; the existing final context age limit of 5000 ms and quote-request age limit of 2000 ms remain authoritative. Reference event age is still checked against the original full 0–2000 ms interval.

Operator evidence: metadata took about 709 ms, reference preparation 3881 ms, and book collection 499 ms. The total context age was 5089 ms, exceeding its limit by 89 ms despite a fresh quote. Reserving book time reduces the preparation wait rather than relaxing the limit.

Only read-only observation supplies this budget. No extra exchange requests, reconnects, account resets or execution permissions are added.

Validation pending for four new tests because the agent environment is offline. Prior validations supplied: lint clean and the three socket-diagnostic tests passed after the literal-type fix; latest supplied full-suite result was 408 tests before socket diagnostics.
