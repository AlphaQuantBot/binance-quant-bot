# Existing PancakeSwap parameter consolidation

This patch preserves the AI Studio application and adds a summary to its existing PancakeDEXAutomation panel. It supersedes the earlier standalone observation rewrite.

## Scope
No server, entry point, trading behavior, external provider or AI prompt is changed.
The summary consumes existing React state from pool-stats, scalper/status, buyback-history and upcoming-listings. It issues no requests itself.
All original screens and buttons remain. This patch does NOT make the entire legacy application read-only; it only adds a read-only consolidated view, as requested.

Tokens are grouped by case-insensitive BSC contract address, never by ticker. Different module values remain in distinct rows instead of silently overwriting each other.
All raw parameters can be expanded. Missing values remain unknown; zero and false are retained.
The table labels safety and listing fields as server-reported, not independently verified.
Per-source receipt and error states show when a response arrived, not when chain data changed. Old values remain visible with a failed-read marker.

## Integration
The uploaded repository has flattened files at its root. The two existing root components are patched in place, with adjacent PancakeObservationSummary.tsx and pancakeObservation.mjs.
In the original AI Studio structure these four files belong together under src/components/; their relative summary imports remain valid. This patch does not repair or replace the unrelated flattened entry point because the running AI Studio application must be preserved.
The uploaded root components are not imported by the old checked-in src/App.tsx. Consequently this summary must be applied to the corresponding working AI Studio component paths before it can be seen there. Do not represent the GitHub snapshot as a verified deployment.

## Validation
CI runs focused pure-data tests, TypeScript checks on the new summary component and syntax/bundle checks on both patched legacy components. These are not whole-application build, browser or live-provider tests.
No wallet/account values are used in fixtures. Full application migration is separate from this narrowly scoped consolidation.
