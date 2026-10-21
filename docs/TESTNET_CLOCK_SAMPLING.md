# Fixed decision reference clock sampling

The last observed stop occurred at POST_BOOK_SNAPSHOT / ACCOUNT_OBSERVATION: the full event-age interval was [714,2062] ms, so rejecting it under the 2000 ms policy was correct. Its width included 1346 ms of clock uncertainty plus timestamp precision.

The read-only decision observer now uses a fixed batch of three measurements: its existing signal /time sample plus exactly two additional sequential unsigned GET requests to the same fixed testnet /api/v3/time endpoint. All three measurements must validate. Their possible server/local offset intervals must overlap; contradictory measurements stop with MEASUREMENTS_DISAGREE. The sample with the shortest actual round trip is selected, retaining its actual original timestamps and monotonic anchor. It is not averaged, retimestamped or assigned a fabricated lower latency.

This is planned sampling on every cycle, not an error-triggered retry. Any transport, HTTP, rate-limit, malformed response, invalid clock, clock jump or expired evidence stops the batch. No failed sample is ignored in favor of earlier evidence. Each added request retains a 12-second transport timeout, no redirects and no credentials.

Sampling happens before stream warmup and account/context collection. Minute scheduling still uses the original signal sample anchor and subtracts work latency; slow work can still create reported gaps. Existing signal freshness and 30-second calibration expiry remain enforced. The full event-age interval must still lie inside [0,2000] ms. Shorter sampling can reduce uncertainty but does not guarantee completion.

Each successful decision report includes referenceClockSampling: sampleCount, the three measured roundTripMs values, and selectedRoundTripMs. No prices or credentials are added to these diagnostics. Manual execution callers and the public signal-only reader retain their existing request behavior.

Tests cover exact endpoint/method/no credentials, fixed request count, minimum-RTT selection, unchanged strict age rejection, failure without retry or fallback, contradictory offsets, invalid initial evidence and local-clock changes. One pure batch-selection scenario passed in the orchestration runtime; native Node tests and real observation remain pending.
