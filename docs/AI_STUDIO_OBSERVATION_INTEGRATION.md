# Apply the Toplu Gozlem panel to the working AI Studio project

The running AI Studio app is preserved. This package only consolidates already-received parameters.
It does not add a backend, provider, poller, trade action or new application entry point.

## Four-file mapping
- repository root PancakeDEXAutomation.tsx -> working src/components/PancakeDEXAutomation.tsx
- repository root PancakeUpcomingListings.tsx -> working src/components/PancakeUpcomingListings.tsx
- repository root PancakeObservationSummary.tsx -> working src/components/PancakeObservationSummary.tsx
- repository root pancakeObservation.mjs -> working src/components/pancakeObservation.mjs

The first two files include the existing full components with narrow changes. Do not copy the flattened repository wholesale over the working project.

## Checked integration
Get the codex/pancakeswap-observation branch in a separate folder. From that folder:
```sh
node scripts/integrate-observation-panel.mjs /absolute/path/to/working-project --check
node scripts/integrate-observation-panel.mjs /absolute/path/to/working-project --apply
```
On Windows use a quoted path such as "C:\\Users\\Serhat\\working-ai-studio-project".
The working project must already contain src/components. Checking is non-writing.
Applying checks every source and target version before writing and backs up changed existing files under .alfaquant-observation-backup-*.
CRLF/LF differences are tolerated. Already-applied files are recognized.
If any working component has independent edits, VERSION_MISMATCH stops the entire plan: do not bypass it or replace files blindly. Reconcile the narrow diff against that actual component version instead.
Pause simultaneous editing while applying. This is a guarded file-copy operation, not a crash-proof transaction. Keep the backup until browser verification is complete.

## AI Studio assistant handoff
Give the AI Studio assistant the four reviewed source files (raw links on the PR branch) and this instruction:

"Mevcut uygulamayi, server.ts, App.tsx, index.html ve vite.config.ts dosyalarini koru.
Yalnizca PancakeSwap Toplu Gozlem panelini entegre et.
PancakeDEXAutomation ve PancakeUpcomingListings degisikliklerini mevcut src/components dosyalarina uygula; PancakeObservationSummary.tsx ve pancakeObservation.mjs dosyalarini ayni klasore ekle.
Mevcut pool-stats, scalper/status, buyback-history ve upcoming-listings yanitlarini kullan.
Yeni API cagrisi, sorgu dongusu, veri saglayici, cuzdan islemi veya otomatik emir ekleme.
Parametreleri sozlesme adresiyle eslestir; farkli modul degerlerini ayri goster.
Surum farki varsa dur ve farki raporla; calisan dosyalari korlemesine degistirme."

## Verify in the working app
Run the working project's existing lint/build.
Open the PancakeSwap panel: Toplu Gozlem should appear above the existing telemetry banner.
Confirm data changes after existing pollers return, without additional requests from the summary.
Compare each row to its source panel, including zero values and same-symbol/different-address tokens.
Disconnect the backend: old values must not acquire a new successful receipt time.
Open and close the listing tab: confirm its received/fallback status is represented, with source claims never called independently verified.
Do not click swap, burn, approve or position-close controls during observation verification.

## Status
The repository tests cover consolidation and guarded transfer behavior. They do not prove integration into the running AI Studio app.
The transfer has not been performed remotely; no AI Studio editor access is available in this session.

## Reviewed source links
- [PancakeDEXAutomation.tsx](https://raw.githubusercontent.com/AlphaQuantBot/binance-quant-bot/3d74e3a5d6565de5c2e0d1e29486b7dcd5523346/PancakeDEXAutomation.tsx)
- [PancakeUpcomingListings.tsx](https://raw.githubusercontent.com/AlphaQuantBot/binance-quant-bot/3d74e3a5d6565de5c2e0d1e29486b7dcd5523346/PancakeUpcomingListings.tsx)
- [PancakeObservationSummary.tsx](https://raw.githubusercontent.com/AlphaQuantBot/binance-quant-bot/3d74e3a5d6565de5c2e0d1e29486b7dcd5523346/PancakeObservationSummary.tsx)
- [pancakeObservation.mjs](https://raw.githubusercontent.com/AlphaQuantBot/binance-quant-bot/3d74e3a5d6565de5c2e0d1e29486b7dcd5523346/pancakeObservation.mjs)
