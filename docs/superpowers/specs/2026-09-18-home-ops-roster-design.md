# Home Ops Roster Design Spec

**Date:** 2026-09-18  
**Status:** Approved (approach A + mobile one-line summary)

## Problem

Home (`/[locale]/home`) is the daily ops board: Secretary tasks plus timed front-store shift cards. Opening the page does not show **who is on leave or day off today**, or whether **today is understaffed**, even though shift rows already load via `loadHomeMemberPanel`.

Secretary tasks `schedule_understaffed` / `schedule_leave_risk` cover **future** days only (`filterFutureUnderstaffedDays` / `filterUpcomingLeaveEntries` exclude today).

## Decision

**Approach A:** Extend the existing "สมาชิกวันนี้" column with:

1. One-line duty summary (`กะหน้าร้าน N · ลา N · หน้าที่อื่น N`)
2. Compact off/leave list for today (name + `ลา` / `วันหยุด` badge + optional remark)
3. Understaffed banner when today's front-store headcount fails `isDayUnderstaffed`

**Mobile hybrid:** When the layout is a single column (`!desktopSplit`), show the same one-line summary under the page date heading so staff see coverage before scrolling to the shift card.

## Architecture

| Layer | Path | Role |
| ----- | ---- | ---- |
| Pure domain | `src/lib/schedule/home-day-roster.ts` | `buildHomeLeaveRows`, `buildHomeDutySummary`, `formatHomeDutySummaryLine` |
| Existing timed rows | `src/lib/schedule/home-shift-status.ts` | Unchanged `buildHomeShiftStatusRows` |
| Snapshot types | `src/lib/schedule/home-member-panel.ts` | Optional serializable `leaveRows` + `dutySummary` |
| SSR fetch | `src/lib/schedule/load-home-member-panel-server.ts` | Populate snapshot fields from profiles + shifts |
| UI | `HomeShiftStatusSection.tsx` | Render summary, banner, leave list, timed cards |
| Mobile strip | `HomeClient.tsx` | One-line summary under `<h1>` when `!desktopSplit` |

## Counting rules

- Only **assigned** schedule-grid shifts (`isScheduleGridShiftAssigned`) count.
- **Front store:** timed `HH:MM` locations (same as current shift cards).
- **Other duty:** e.g. `ไปสาขา 2`, `ร้านซักผ้า`.
- **Off/leave group:** single list; `ลา` vs `วันหยุด` (and other non-working labels normalized to day-off) via badges.
- Profiles with **no** assigned shift are omitted (not treated as day off).
- **Understaffed today:** `isDayUnderstaffed` with `headcount = frontStoreCount`, `dayIndex` Monday=0 from `dateIso`, `isPublicHoliday` optional (default `false` when unknown). Thresholds from `INSIGHT_THRESHOLDS`.

## UI copy

- Section title: **คนและกะวันนี้**
- Empty leave section: omit the list (no "ไม่มีลาวันนี้" unless showing empty desktop column with no timed staff either).
- Understaffed banner (Thai): short notice that front-store headcount is low for today; read-only (no deep link from leave rows).

## Relationship to Secretary board

- Keep `schedule_*` tasks for upcoming days and action overlays.
- Home roster answers **who is off today / is today short**; task cards answer **what to do next**.

## Out of scope

- Inventory / bean-order KPIs on home
- Moving weekly dashboard onto home
- Hourly coverage gaps
- Editing schedule from home
- Fetching public-holiday flags on the home panel in phase 1 (optional later via `weeklyDays`)

## Testing

- Vitest for `buildHomeLeaveRows` / `buildHomeDutySummary` (leave, day off, front store, other duty, understaffed threshold).
- Source/layout tests updated if section title or HomeClient summary wiring changes.
