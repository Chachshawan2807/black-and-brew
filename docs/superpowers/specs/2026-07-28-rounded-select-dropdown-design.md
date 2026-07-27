# Rounded Select Dropdown — Design Spec

**Date:** 2026-07-28  
**Status:** Approved (approach 1)  
**Risk:** R0 (UI styling)

## Goal

Make every native `<select>` / form dropdown trigger match the visual language of `ClickableDatePicker` (rounded pill, card surface, light shadow, chevron) — without changing behavior to a custom popover menu.

## Visual token (date-picker aligned)

Shared classes for the select control:

- `h-11` · `rounded-3xl` · `bg-card` · `border border-border`
- `px-4 pr-10` · `appearance-none` · `bb-shadow-sm`
- `text-foreground` · `text-sm` (or existing size if filter is compact)
- `hover:bg-muted/50` · `transition-all duration-200`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20`
- ChevronDown overlay (`absolute right-3`, `pointer-events-none`, muted)

Do **not** force `uppercase` on select text (Thai labels / long option text).

## Approach

1. Shared UI helper in `src/components/ui/`:
   - Style constants for trigger, list panel, and option rows (`BB_SELECT_*`)
   - `RoundedSelect` custom listbox (button + rounded option menu) — native `<option>` popups cannot be styled
2. Migrate in-scope selects to `RoundedSelect`.
3. Theme tokens (`bg-card`, `text-foreground`, `bg-muted`) for light/dark correctness.

## In scope

| Location | Notes |
|----------|--------|
| `BeanOrderSelect` + `BEAN_ORDER_SELECT` | Point at shared token; list filters in `BeanOrdersClient` use wrapper/token |
| `MonthlyRoster` staff select | Keep `w-fit` sizing; apply rounded trigger styles |
| `SalesClient` category filter | Upgrade from `rounded-lg` |
| Maintenance task-type button | Align trigger look if it mimics a select |
| Any other project `<select>` outside schedule | Include |

## Out of scope (do not change)

- **All selects / dropdowns under schedule** — grid shift-type portal menu **and** any `<select>` inside schedule modals (`ScheduleClient` leave/management/holiday, `ShiftSettingsModal`, etc.)
- Custom Radix `DropdownMenu` menus used as action menus (not form selects), unless they are clearly form-filter triggers
- Replacing native `<select>` with a fully custom popover

## Testing

- Unit/source tests: assert shared token / `RoundedSelect` usage where existing tests pin select classNames (e.g. MonthlyRoster `w-fit`)
- Manual: open each filter select; verify chevron + pill shape; confirm schedule shift picker unchanged

## Self-review

- No placeholders or TBD
- Exclusion matches user clarification: **all schedule modal selects + grid shift picker**
- Scope is styling-only; no schema/auth changes
- In-scope: bean-orders, sales, dashboard roster, maintenance task-type trigger; whole project except schedule
