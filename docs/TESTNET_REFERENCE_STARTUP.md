# Initial subscription warmup

The read-only decision observer now awaits a first fresh reference event before starting account/context collection. This startup warmup has a fixed 12000 ms deadline. The ordinary current-price read retains its 4000 ms deadline.

A successful warmup happens once per stream. Persistent decision-watch sessions reuse its completion; subsequent null/stale cache states cannot obtain another long startup wait. The single-decision command also warms its own stream. No reconnect or repeated subscription is introduced.

Warmup accepts only a genuinely fresh event under the existing full [0,2000] ms server-age interval and local receipt-age rules. Longer waiting does not increase accepted price age. Fresh account/context collection starts after warmup so startup waiting does not consume their freshness budgets. Existing calibration expiry, signal-age checks and bounded minute scheduling remain enforced.

A silent startup timeout includes streamDiagnostics.waitPhase=STARTUP and waitLimitMs=12000. Ordinary reads continue to show waitLimitMs=4000. Startup freshness failures are labeled STARTUP_WARMUP in referenceTiming.stage. Disconnect, malformed messages and abort/close still reject immediately.

Observed before this change: first connection opened, no messages arrived before the ordinary 4-second read deadline, and no decision completed. The new deadline gives startup more time; it does not guarantee provider messages.

Tests cover delayed first event after five seconds, unchanged subsequent deadline, no repeated warmup after null, stale-event rejection, exact startup deadline and prompt close/disconnect handling. Native Node validation is pending because the development execution container is unavailable.
