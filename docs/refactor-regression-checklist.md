# Refactor Regression Checklist

Quick reference for smoke testing after each refactor PR.

| Area | Key flows to verify |
| --- | --- |
| Inventory | cell edit, undo/redo, DnD reorder, PO export, realtime, FAB |
| Branch withdraw | grid qty entry, save dialog, history panel, stock IN sync |
| Inventory quick bulk | multi-item IN/OUT via FAB, per-entry success/error feedback |
| Count verification | count page blur saves stock; accuracy badge after verification |
| Schedule | drag shift, undo/redo, holidays, week nav |
| Dashboard | LiveShiftList, MonthlyRoster, LiveStatusTracker |
| Bean orders | create/edit, payment slip, ship, manual delivery confirm |
| Proactive insights | cron/manual `/api/insight-alerts`, NotificationBell digest, HomeOpsPanels |
| Secretary | board load, derived sync, manual task create/complete/defer, sidebar badge |
| Notification hub | start at `use-inventory-notifications.ts`; FAB/panel/badge/OS push share one state; see `AGENTS.md` notification-hub-standard |
| Notification FAB | unread badge, panel view-only, cross-tab + visibility hydrate; FAB stack via `FloatingOverlayContext` + `floating-action-layout.ts` |
| Auth | PIN, logout, session revocation |
| Notifications | bell count (unread counter reconcile), panel, cross-tab sync, iOS/Android Web Push resume; automated: `npm run test:notifications` |
| Settings | theme, notification prefs, data change history |
| Tooltips | HintTooltip on FAB/toolbar icons (hover + keyboard focus) |

**Automated:** `npm run lint && npm run test && npm run build`

**Targeted (v8.6):** `npm test -- inventory-count-accuracy inventory-in-out-theoretical inventory-quick-bulk inventory-quick-action-draft`

**Targeted (notifications):** `npm run test:notifications` or `npm run skill:run notification-smoke`
