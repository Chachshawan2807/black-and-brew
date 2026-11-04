# Usability heuristics audit (Nielsen 10)

> Date: 2026-09-04 | Standard: `AGENTS.md` `nielsen-usability-heuristics-standard`

Quick pass over core ERP routes. P0 items in this round are fixed or tracked below. Remaining items are backlog (not blocking).

## Summary by module

| Module | Strong | Gaps |
| ------ | ------ | ---- |
| Inventory + branch withdraw + count | Spreadsheet feedback, undo, `loading.tsx`, quick-action `aria-busy` | Some Server Action paths still return raw `error.message` (inventory-actions) |
| Schedule | Undo/redo, FloatingAlert, copy-week busy state + confirm dialog | Copy-week catch previously surfaced `Error.message` (fixed this round) |
| Dashboard + Home | Route loading, secretary pending states | home-actions raw `error.message` backlog |
| Settings | Busy on passkey / remote session revoke, HintTooltip elsewhere | app-preferences returned English/raw errors (fixed this round) |
| Bean orders | Form `saving`, detail `busy` + disabled buttons, confirm on destructive | Many action returns used raw Supabase `error.message` (fixed this round); confirm save label lacked busy text (fixed) |

## P0 / P1 findings

| ID | Heuristic | Finding | Status |
| -- | --------- | ------- | ------ |
| P0-1 | N9 | `bean-order-actions.ts` returns `error.message` to clients that render in UI | Fixed via `toUserFacingError` |
| P0-2 | N9 | `app-preferences-actions.ts` returns raw/English errors | Fixed |
| P0-3 | N9 | Schedule copy-previous-week catch showed `error.message` | Fixed |
| P0-4 | N1 | Bean order save confirm button had no busy label while `saving` | Fixed (`กำลังบันทึก…`) |
| P1-1 | N9 | `inventory-actions`, `home-actions`, `shift-actions`, `maintenance-actions` still return raw messages | Backlog |
| P1-2 | N4/N5 | `window.confirm` still used in schedule / bean-orders / settings | Backlog (prefer `<dialog>`) |
| P1-3 | N1 | Sidebar menu order save fails silently in `SidebarMenuOrderSync` | Backlog |
| P1-4 | N10 | No centralized in-app help; rely on HintTooltip + `docs/context.md` | Accepted for now |

## Exceptions respected

- Notification panel remains view-only (no row navigation).
- Inventory spreadsheet keeps inline cells (no edit modals for simple edits).
- Transaction ledger stays off the UI undo stack.

## Next passes

1. Roll `toUserFacingError` / `logSupabaseError` through remaining Server Actions listed in P1-1.
2. Replace high-traffic `window.confirm` with native `<dialog>` confirm patterns.
3. Optional: surface sidebar sync save failures with FloatingAlert.
