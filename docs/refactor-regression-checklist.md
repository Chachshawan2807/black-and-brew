# Refactor Regression Checklist

Quick reference for smoke testing after each refactor PR.

| Area | Key flows to verify |
| --- | --- |
| Inventory | cell edit, undo/redo, DnD reorder, PO export, realtime, FAB |
| Branch withdraw | grid qty entry, save dialog, history panel, stock IN sync |
| Inventory quick bulk | multi-item IN/OUT via FAB, per-entry success/error feedback |
| Count verification | count page blur saves stock; accuracy badge after verification |
| Schedule | drag shift, undo/redo, holidays, week nav |
| Sales | charts, XLSX upload, category edit, metrics cache |
| Dashboard | LiveShiftList, MonthlyRoster, LiveStatusTracker |
| Auth | PIN, logout, session revocation |
| Notifications | bell count (unread counter), panel, cross-tab sync, inventory alerts |
| Settings | theme, notification prefs, data change history |
| Tooltips | HintTooltip on FAB/toolbar icons (hover + keyboard focus) |

**Automated:** `npm run lint && npm run test && npm run build`

**Targeted (v8.6):** `npm test -- inventory-count-accuracy inventory-in-out-theoretical inventory-quick-bulk inventory-quick-action-draft`
