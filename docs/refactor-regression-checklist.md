# Refactor Regression Checklist

Quick reference for smoke testing after each refactor PR. Full details in [docs/plans/2026-06-12-refactor-phase0-baseline.md](plans/2026-06-12-refactor-phase0-baseline.md).

| Area | Key flows to verify |
| --- | --- |
| Inventory | cell edit, undo/redo, DnD reorder, PO export, realtime, FAB |
| Schedule | drag shift, undo/redo, holidays, week nav |
| Sales | charts, XLSX upload, category edit, metrics cache |
| Dashboard | LiveShiftList, MonthlyRoster, LiveStatusTracker |
| Auth | PIN, logout, session revocation |
| Notifications | bell count, panel, inventory alerts |
| Settings | theme, notification prefs |

**Automated:** `npm run lint && npm run test && npm run build`
