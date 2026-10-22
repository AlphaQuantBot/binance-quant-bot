# One reference subscription per bounded decision-watch session

The operator observed four contiguous HOLD/WAIT decisions before cycle five stopped. Diagnostics showed opened=true, messages=0, waitLimitMs=4000: the new cycle's socket opened but delivered no messages before its read deadline. This does not prove why the provider was silent.

The watcher now owns one lazy DecisionReferenceSession. Its first observation opens the fixed public BTCUSDT subscription; subsequent observations reuse it. Each cycle still obtains its own REST /time measurement and refreshes clock evidence before reading the stream. Each observation continues to open and close its own journal and collect fresh account/context evidence.

Between cycles the stream records actual message timestamps and local receipt times without evaluating the previous cycle's expiring clock measurement. Cached events are validated when read or snapshotted, using the current measurement. Neither event nor receipt timestamps are changed by clock refresh.

A failed or closed connection is terminal: the session never replaces it. Updating clock evidence during a pending read is refused. Stale prices, null prices, disconnects and malformed messages keep their existing blocking behavior. The read deadline stays 4000 ms; no fallback, reconnect, repeated HTTP read or automatic order is added.

The session closes in the watch command's finally block on completion or failure, and immediately on abort including while waiting between cycles. The single-decision command retains its own one-observation stream lifetime.

Stream timeout counters now cover the whole watch subscription, including inter-cycle messages, rather than a new connection per cycle. They remain cumulative diagnostic evidence, not proof of freshness.

Tests cover one connection across an idle minute, new calibration without timestamp rewriting, stale cached prices, retained disconnection, terminal/idempotent close, pending read cleanup, and busy-reader protection. Node tests and the actual ten-cycle run remain pending for this commit because the development execution container is unavailable.
