# Home Ops Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show today's leave/day-off roster and understaffed warning on the home page next to timed shift cards, plus a mobile one-line summary under the date heading.

**Architecture:** Pure helpers in `src/lib/schedule/home-day-roster.ts` derive leave rows and duty summary from the same profiles + shifts already loaded for `HomeShiftStatusSection`. SSR snapshot gains optional precomputed fields; the client recomputes after realtime refresh. UI stays inside the right-hand member card (approach A) with a compact summary line on mobile in `HomeClient`.

**Tech Stack:** Next.js App Router, React 19, Vitest, existing `format-daily-shifts` / `week-schedule` / schedule-grid parity helpers.

## Global Constraints

- No em dash (U+2014); use spaces in copy and docs.
- Pastel warning banner must use `bb-pastel-surface` / `PASTEL_SURFACE` so text stays black in both themes.
- Theme tokens for non-pastel surfaces (`bg-card`, `text-muted-foreground`, etc.).
- Read-only: no schedule edits or navigation from leave rows.
- Hub-first schedule logic lives under `src/lib/schedule/`; mutations stay out of this feature.
- Typography: `font-normal` only.

---

### Task 1: Domain helpers + failing tests

**Files:**
- Create: `src/lib/schedule/home-day-roster.ts`
- Create: `src/test/home-day-roster.test.ts`

**Interfaces:**
- Consumes: `HomeShiftProfile`, `ClientShiftRow`, `isDayUnderstaffed`, schedule-grid parity, `normalizeShiftLocation` / `categorizeShift`, `getLeaveRemark`, `INSIGHT_THRESHOLDS` (via `isDayUnderstaffed`)
- Produces:
  - `HomeOffOrLeaveRow` `{ profileId, fullName, scheduleOrder, kind: 'leave' | 'day_off', label: string, remark?: string }`
  - `HomeDutySummary` `{ frontStoreCount, otherDutyCount, leaveCount, dayOffCount, isUnderstaffedToday }`
  - `buildHomeLeaveRows(profiles, shifts, dateIso): HomeOffOrLeaveRow[]`
  - `buildHomeDutySummary(profiles, shifts, dateIso, opts?: { isPublicHoliday?: boolean }): HomeDutySummary`
  - `formatHomeDutySummaryLine(summary: HomeDutySummary): string`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, test } from 'vitest';
import {
  buildHomeLeaveRows,
  buildHomeDutySummary,
  formatHomeDutySummaryLine,
} from '@/lib/schedule/home-day-roster';

const dateIso = '2026-09-18'; // Friday → dayIndex 4, weekly limit 3

const profiles = [
  { id: '1', full_name: 'นิต้า', schedule_order: 1 },
  { id: '2', full_name: 'ปิ่น', schedule_order: 2 },
  { id: '3', full_name: 'มุก', schedule_order: 3 },
  { id: '4', full_name: 'เม', schedule_order: 4 },
  { id: '5', full_name: 'มีนา', schedule_order: 5 },
];

function shift(
  employee_id: string,
  location: string,
  status = 'scheduled',
  extra?: { remark?: string },
) {
  return {
    id: employee_id,
    employee_id,
    start_time: `${dateIso}T00:00:00`,
    end_time: `${dateIso}T23:59:59`,
    status,
    metadata: { location, ...extra },
  };
}

describe('buildHomeLeaveRows', () => {
  test('lists leave and day off for assigned shifts only', () => {
    const rows = buildHomeLeaveRows(
      profiles,
      [
        shift('1', '6:30'),
        shift('2', 'ลา', 'on_leave', { remark: 'ธุระส่วนตัว' }),
        shift('3', 'วันหยุด'),
        shift('4', 'ไปสาขา 2'),
      ],
      dateIso,
    );
    expect(rows.map((r) => `${r.fullName}:${r.kind}:${r.label}`)).toEqual([
      'ปิ่น:leave:ลา',
      'มุก:day_off:วันหยุด',
    ]);
    expect(rows[0].remark).toBe('ธุระส่วนตัว');
  });

  test('omits profiles with no assigned shift', () => {
    const rows = buildHomeLeaveRows(profiles, [shift('1', '6:30')], dateIso);
    expect(rows).toEqual([]);
  });
});

describe('buildHomeDutySummary', () => {
  test('counts categories and flags understaffed Friday when front store <= 3', () => {
    const summary = buildHomeDutySummary(
      profiles,
      [
        shift('1', '6:30'),
        shift('2', '7:00'),
        shift('3', 'ลา', 'on_leave'),
        shift('4', 'ไปสาขา 2'),
        shift('5', 'วันหยุด'),
      ],
      dateIso,
    );
    expect(summary).toMatchObject({
      frontStoreCount: 2,
      otherDutyCount: 1,
      leaveCount: 1,
      dayOffCount: 1,
      isUnderstaffedToday: true,
    });
    expect(formatHomeDutySummaryLine(summary)).toBe(
      'กะหน้าร้าน 2 · ลา 1 · หน้าที่อื่น 1',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/home-day-roster.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

Implement `home-day-roster.ts` using schedule-grid resolve + categorize; compute `dayIndex` via `getWeekDateIsos(dateIso).indexOf(dateIso)`.

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx vitest run src/test/home-day-roster.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/schedule/home-day-roster.ts src/test/home-day-roster.test.ts
git commit -m "feat(home): add day roster leave and duty summary helpers"
```

---

### Task 2: Extend member panel snapshot + SSR

**Files:**
- Modify: `src/lib/schedule/home-member-panel.ts`
- Modify: `src/lib/schedule/load-home-member-panel-server.ts`

**Interfaces:**
- Consumes: `buildHomeLeaveRows`, `buildHomeDutySummary`
- Produces: `HomeMemberPanelSnapshot` with optional `leaveRows?: HomeOffOrLeaveRow[]` and `dutySummary?: HomeDutySummary`

- [ ] **Step 1: Extend type**

```typescript
import type { HomeOffOrLeaveRow, HomeDutySummary } from '@/lib/schedule/home-day-roster';

export type HomeMemberPanelSnapshot = {
  dateIso: string;
  profiles: HomeShiftProfile[];
  shifts: ClientShiftRow[];
  leaveRows?: HomeOffOrLeaveRow[];
  dutySummary?: HomeDutySummary;
};
```

- [ ] **Step 2: Populate in server fetch**

After loading profiles and shifts, set `leaveRows` and `dutySummary` from the builders.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schedule/home-member-panel.ts src/lib/schedule/load-home-member-panel-server.ts
git commit -m "feat(home): SSR leave rows and duty summary on member panel"
```

---

### Task 3: HomeShiftStatusSection UI

**Files:**
- Modify: `src/app/[locale]/home/_components/HomeShiftStatusSection.tsx`
- Modify: `src/test/home-desktop-dashboard-layout.test.ts` (or add `src/test/home-ops-roster-ui.test.ts` source assertions)

**Interfaces:**
- Consumes: `buildHomeLeaveRows`, `buildHomeDutySummary`, `formatHomeDutySummaryLine`, `PASTEL_SURFACE`
- Produces: Updated section with title คนและกะวันนี้, summary line, understaffed banner, leave list, timed cards

- [ ] **Step 1: Write source test for new copy / helpers usage**

Assert file contains `คนและกะวันนี้`, `buildHomeLeaveRows`, `formatHomeDutySummaryLine`, understaffed banner class / copy.

- [ ] **Step 2: Implement UI**

- Recompute leave + summary with `useMemo` from profiles/shifts/dateIso.
- Show section when there are timed rows **or** leave rows **or** `showWhenEmpty`.
- Badge on header can show front-store count (or total working).
- Leave list: compact rows, no links.
- Banner only when `isUnderstaffedToday`.

- [ ] **Step 3: Run related tests**

Run: `npx vitest run src/test/home-day-roster.test.ts src/test/home-desktop-dashboard-layout.test.ts src/test/home-ops-roster-ui.test.ts`

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/home/_components/HomeShiftStatusSection.tsx src/test/home-ops-roster-ui.test.ts
git commit -m "feat(home): show leave roster and understaffed banner on shift panel"
```

---

### Task 4: Mobile summary under page title

**Files:**
- Modify: `src/app/[locale]/home/HomeClient.tsx`

**Interfaces:**
- Consumes: `initialMemberPanel` duty summary (or derive via builders when panel present); `desktopSplit`
- Produces: Muted one-line summary under `<h1>` when `!desktopSplit` and summary exists

- [ ] **Step 1: Render summary under header when single column**

Use `formatHomeDutySummaryLine` from panel `dutySummary` or recompute if only profiles/shifts present. Hide when desktop split (column already shows it).

- [ ] **Step 2: Source test update**

Assert `HomeClient` uses `formatHomeDutySummaryLine` and gates on `desktopSplit`.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/home/HomeClient.tsx src/test/home-ops-roster-ui.test.ts
git commit -m "feat(home): mobile duty summary under work date heading"
```

---

## Spec coverage self-review

| Spec requirement | Task |
| ---------------- | ---- |
| Leave/day-off list today | 1, 3 |
| Duty summary line | 1, 3, 4 |
| Understaffed banner via `isDayUnderstaffed` | 1, 3 |
| Approach A column extension | 3 |
| Mobile one-line under h1 | 4 |
| SSR snapshot fields | 2 |
| No deep links from leave rows | 3 |
| Out of scope KPIs / hourly | not implemented |

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-18-home-ops-roster.md`.

User already requested full implementation in this session: execute **Inline** (this agent implements Tasks 1–4 now).
