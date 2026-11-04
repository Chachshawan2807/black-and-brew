# Usability heuristics audit (Nielsen 10)

> Date: 2026-09-04 (updated) | Standard: `AGENTS.md` `nielsen-usability-heuristics-standard`

Core ERP routes audited against N1 (visibility), N3 (user control), N4/N5 (consistency and confirm dialogs), and N9 (plain-language errors).

## Summary by module

| Module | Strong | Gaps |
| ------ | ------ | ---- |
| Inventory + branch withdraw + count | Spreadsheet feedback, undo, banners; grid/quick-action/history/count PIN ใช้ `resolveActionError` / `toUserFacingError` | |
| Schedule | Undo/redo, `PageStatusBanner`, copy-week confirm, `TextConfirmDialog`; DnD/copy/clear/save ใช้ `resolveActionError` | Large surface; keep new flows on banner + dialog pattern |
| Dashboard + Home | Roster export notice banner, home/overlay load errors via `resolveActionError`; dashboard DnD order แจ้งผ่าน `notifyUser` | |
| Settings | Passkey / remote session revoke busy states, revoke-all `TextConfirmDialog` | |
| Bean orders | Save busy labels, `TextConfirmDialog` on revert/delivered/delete | |
| Shell | Sidebar menu order save failure banner | |

## P0 / P1 findings (this pass)

| ID | Heuristic | Finding | Status |
| -- | --------- | ------- | ------ |
| P0-1 | N9 | Bean order actions user-facing errors | Fixed (prior pass) |
| P0-2 | N9 | App preferences raw errors | Fixed (prior pass) |
| P1-1 | N1/N9 | `alert()` on schedule, inventory, dashboard roster, quick-action | Fixed: `PageStatusBanner` + `useTimedPageNotice` |
| P1-2 | N3/N5 | `window.confirm` on schedule, bean orders, settings revoke-all | Fixed: `TextConfirmDialog` |
| P1-3 | N1 | Sidebar menu order save fails silently | Fixed: `SidebarMenuOrderSaveNotice` |
| P1-4 | N9 | Client catch blocks surfacing `error.message` (maintenance, home, branch withdraw) | Fixed: `toUserFacingError` |
| P1-5 | N10 | No centralized in-app help | Accepted: HintTooltip + `docs/context.md` |
| P1-6 | N2/N9 | English validation/auth strings in actions + `UNAUTHORIZED_MSG` | Fixed (Thai) |
| P1-7 | N9 | `InventoryClient` catch + offline replay/holiday-sync messages | Fixed |
| P1-8 | N2/N9 | Cron/API/webhook JSON errors (English codes, raw `Internal Server Error`) | Fixed: `public-error`, `route-auth`, `src/app/api/*` (machine `code` where useful) |
| P1-9 | N9 | History/home/schedule passkey + `data_change_logs.error_message` technical copy | Fixed: history query, secretary sync, holiday-sync, client wraps, passkey map; `[locale]/error.tsx` Thai via `toUserFacingError`; settings history read sanitize + load `resolveActionError`; maintenance/bean orders/branch withdraw/login history/remote sessions/payment slip client wraps; new log rows via `dataChangeLogErrorFromUnknown` in shift/inventory/maintenance actions (insert still sanitizes) |

## Exceptions respected

- Notification panel remains view-only (no row navigation).
- Inventory spreadsheet keeps inline cells (no edit modals for simple edits).
- Transaction ledger stays off the UI undo stack.

## Maintenance

1. New UI feedback: prefer `PageStatusBanner` / in-form `role="alert"`, not `alert()`.
2. Destructive or irreversible actions: `TextConfirmDialog` or existing native `<dialog>` patterns.
3. Server and client errors shown to staff: `toUserFacingError` / `actionFail`.
