# Dark Theme Remediation Plan

> Created: 2026-06-12 | Status: Phases 0–7 complete (visual QA manual) | Shipped 2026-06-12

## Goal

Fix incomplete dark theme across all modules so UI meets WCAG AA contrast and the project token standard (`docs/design.md` §11, `AGENTS.md` dark-theme rules).

## Architecture (unchanged)

| Layer | Path | Role |
| --- | --- | --- |
| CSS tokens | `src/app/[locale]/globals.css` | `:root` / `.dark` + `.bb-pastel-surface` |
| Provider | `src/components/providers/ThemeProvider.tsx` | `next-themes`, `storageKey="bb-theme"` |
| Pastel constants | `src/lib/shift-colors.ts` | `PASTEL_SURFACE`, shift/sales/inventory colors |
| Settings | `src/app/[locale]/settings/page.tsx` | User picks light / dark / system |

## Surface decision matrix

| Surface | Background | Text |
| --- | --- | --- |
| Page / modal / table | `bg-background`, `bg-card` | `text-foreground`, `text-muted-foreground` |
| Pastel accent (shift, metrics, quick actions) | Keep hex pastels | `bb-pastel-surface` → black text/icons |
| Borders | `border-border` | — |
| Charts | Theme-aware tick/grid/bar (Phase 6) | — |

## Pass criteria (per route, theme = dark)

1. No large white/cream blocks (`bg-white`, `bg-[#fdfcf0]`) on page wrappers.
2. Body text contrast readable on `bg-card` / `bg-background`.
3. Placeholders and labels visible on inputs (`bg-card`, `placeholder:text-muted-foreground`).
4. Pastel cards: black text (via `bb-pastel-surface`), not white/`text-foreground`.
5. Table cells: no `text-neutral-600`–`900` on dark rows.
6. Recharts: axis labels and bars visible (not `fill: 'black'` on dark).
7. `npm run build` passes after each phase.

## Phase 0 — Audit baseline (2026-06-12)

### Grep summary (`src/**/*.tsx`, `src/**/*.ts`)

| Pattern | Files | Notes |
| --- | ---: | --- |
| `bg-white` / `bg-white/` | 21 | Highest impact — shared UI + dashboard + schedule |
| `text-black` / `text-[#000000]` | 10 | OK inside pastel; bad on dark surfaces |
| `text-neutral-*` | 4 | Maintenance table, PinGateway, inventory PO modal |
| Chart `fill: 'black'` / dark rgba grid | 2 | `sales/page.tsx`, `InsightCharts.tsx` |
| `bg-[#fff*` / `bg-[#fdfcf0]` | 13 | Mix of intentional pastels + hardcoded surfaces |

### `bb-pastel-surface` adoption (partial)

Present in: `shift-colors.ts`, `ScheduleClient` shiftTypes, `sales/page` (1 block), `inventory/count` active card.

Missing on: dashboard stat pills (use `DASHBOARD_STAT_COLORS` but parent cards still `bg-white/80`), sales category grid, market alert cards, inventory quick actions wrapper.

---

## Phase 1 — Shared primitives ✅ (2026-06-12)

| File | Done |
| --- | --- |
| `src/components/ui/ClickableInput.tsx` | `bg-card`, `border-border`, muted placeholder |
| `src/components/ui/ClickableDatePicker.tsx` | trigger `bg-card`; calendar tokens + pastel today |
| `src/components/ui/dropdown-menu.tsx` | `bg-card`, `focus:bg-muted`, `bg-border` separator |
| `src/components/inventory/InventoryQuickActionBar.tsx` | `bg-card`; pastel save + action buttons |
| `src/components/inventory/InventoryAddItemModal.tsx` | `bg-card`, theme labels/inputs/buttons |
| `src/components/inventory/InventoryHistoryModal.tsx` | table `bg-background`; pastel type badges |
| `src/app/[locale]/globals.css` | `.bb-pastel-surface` placeholder overrides |

**Next:** Multitask Phase 2–6 (do not edit Phase 1 files unless fixing regressions).

---

## Phase 2 — Command Center + Dashboard

| Route | Files |
| --- | --- |
| `/[locale]` | `src/components/dashboard/LiveStatusTracker.tsx`, `src/app/[locale]/LiveStatusTracker.tsx` |
| `/[locale]/dashboard` | `LiveShiftList.tsx`, `MonthlyRoster.tsx`, `LiveStatusTracker.tsx` (dashboard copy) |

Key fixes: `bg-white/80` sections → `bg-card`; MonthlyRoster table `bg-white` → tokens; stat pills keep `DASHBOARD_STAT_COLORS`.

---

## Phase 3 — Schedule

| Route | Files |
| --- | --- |
| `/[locale]/schedule` | `ScheduleClient.tsx` |

Key fixes: drag `bg-white`, management modal inputs/history table, `border-black/5` → `border-border`.

---

## Phase 4 — Maintenance

| Route | Files |
| --- | --- |
| `/[locale]/maintenance` | `page.tsx`, `MaintenanceModals.tsx` |

Key fixes: `text-neutral-600/800/900` in tbody; modal inputs and primary button visibility.

---

## Phase 5 — Inventory

| Route | Files |
| --- | --- |
| `/[locale]/inventory` | `page.tsx`, `PurchaseOrdersModal.tsx`, quick action components |
| `/[locale]/inventory/count` | `count/page.tsx` (verify active cell) |

Key fixes: quick bar wrapper, add/history modals, PO modal hardcodes, cell `neutral-*` tints.

---

## Phase 6 — Sales + Market Insights

| Route | Files |
| --- | --- |
| `/[locale]/sales` | `sales/page.tsx` + new `src/lib/chart-theme.ts` |
| `/[locale]/market-insights` | `InsightCharts.tsx`, `AlertsCard.tsx`, `ContextPanel.tsx`, `CompetitorPanel.tsx`, `DiffBanner.tsx`, `ActionChecklist.tsx`, `page.tsx` |

Key fixes: Recharts theme; pastel alert cards + `bb-pastel-surface`; category subtext on pastel.

---

## Phase 7 — Integration (after Multitask) ✅

1. `npm run build` — passed (35/35 static pages, 2026-06-12)
2. Re-grep audit — `fill: 'black'` eliminated; remaining `bg-white` is intentional (pastel surfaces, PO PNG export, PinGateway PIN cells, ThemePicker/button dark variants) or test-only (`CommandCenterGrid.tsx`)
3. Manual dark-mode pass all routes — **pending** (operator QA)
4. `docs/changelog.md` entry if shipped — optional

---

## File inventory — `bg-white` hits (Phase 0 snapshot)

| Module | File | Lines (approx) |
| --- | --- | --- |
| Shared UI | `ClickableInput.tsx` | 55 |
| Shared UI | `ClickableDatePicker.tsx` | 347, 351 |
| Shared UI | `dropdown-menu.tsx` | 50, 68 |
| Shared UI | `button.tsx` | dark: variants OK |
| Dashboard | `LiveStatusTracker.tsx` (components) | 178 |
| Dashboard | `LiveStatusTracker.tsx` ([locale]) | 58 |
| Dashboard | `LiveShiftList.tsx` | 78, 252, 316 |
| Dashboard | `MonthlyRoster.tsx` | 132, 139, 154, 174, 205 |
| Schedule | `ScheduleClient.tsx` | 236, 254, 293, 754 |
| Inventory | `InventoryQuickActionBar.tsx` | 73 |
| Inventory | `InventoryAddItemModal.tsx` | 102 |
| Inventory | `InventoryHistoryModal.tsx` | 151, 177, 335 |
| Inventory | `InventoryQuickActionFAB.tsx` | 350 |
| Inventory | `PurchaseOrdersModal.tsx` | 74, 139, 144 |
| Inventory | `count/page.tsx` | 117 (active input on pastel — OK) |
| Sales | `sales/page.tsx` | 11 hits (pastel + selects) |
| Other | `CommandCenterGrid.tsx` | 71, 96, 171 |
| Other | `PinGateway.tsx` | 272 (PIN cells — review) |
| Other | `ThemePicker.tsx` | dark: variants present |

---

## Verification commands

```bash
# Re-run audit after each phase
rg "bg-white|bg-white/" src --glob "*.{tsx,ts}" -c
rg "text-neutral-[0-9]" src --glob "*.{tsx,ts}"
rg "fill: 'black'|fill: \"black\"" src --glob "*.{tsx,ts}"

npm run build
```
