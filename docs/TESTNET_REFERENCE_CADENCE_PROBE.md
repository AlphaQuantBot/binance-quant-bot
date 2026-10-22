# Independent reference arrival cadence probe

Run a single bounded public subscription independently of decision observation:

```powershell
npm.cmd run testnet:reference-cadence -- 300
```

Duration is explicit, integer 10–600 seconds. The command opens exactly one fixed BTCUSDT reference-price WebSocket on the testnet host. It does not open account, capital or decision journals; read keys; request metadata or books; submit orders; reconnect; or fall back to REST.

The output counts validated reference messages, null and non-null prices, and consecutive client arrival gaps in four buckets (<=1s, >1–2s, >2–4s, >4s). maxMessageGapMs covers only completed intervals between messages. Startup delay and trailing silence are reported separately; a completely silent probe has null message-age and interval metrics, not invented zeros. Ctrl+C emits an INTERRUPTED summary and closes the socket. Malformed data and transport close/error stop with fixed safe codes.

Timing uses the client's monotonic clock and includes local delivery/scheduling delay. Exchange timestamps are schema-checked but are not clock-calibrated or used to authorize freshness. No prices, raw timestamps, payloads or credentials are output. A null-price message counts as transport activity, never a usable price.

This probe can establish that a >4-second arrival gap also occurs without decision REST/account work. It cannot independently distinguish server publication delay, network stalls, or client scheduling, and a gap-free short run cannot prove those causes absent. It is not a trading readiness or profitability assessment.

Run after prior observation has stopped so the experiment uses one diagnostic connection. Results are not persisted automatically.

Native validation of four new tests is pending: the agent execution environment is offline. Latest supplied prior validation: lint clean and 415 full-suite tests passed.
