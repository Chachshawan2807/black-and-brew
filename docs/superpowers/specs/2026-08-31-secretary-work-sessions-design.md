# Secretary Work Sessions Design Spec

**Date:** 2026-08-31  
**Status:** Approved (option A)

## Problem

Personal Secretary guidance lists every board card as a separate sequential step. Schedule tasks
(`schedule_understaffed`, `schedule_leave_risk`) share the same `/schedule` screen but appear as:

> "ตรวจตาราง วันที่คนน้อย" แล้วต่อด้วย "ตรวจตาราง ลาหลายคน"

Managers should open the schedule once and review both concerns in one visit.

## Decision

**Option A:** Keep separate board cards; group guidance and ordering by **work session**.

## Architecture

- `src/lib/secretary/task-work-sessions.ts` ERP domain registry of sessions
- Guidance fallback groups consecutive same-session tasks into one quoted step
- AI prompts receive session metadata and grouping rules
- Task-order fallback keeps same-session tasks adjacent
- Guidance validation checks session labels and sub-labels, not raw `"แล้วต่อด้วย"` between session siblings

## Guidance format

Multi-task session:

```text
"ตรวจตารางงาน" (วันที่คนน้อย และ ลาหลายคน)
```

Single-task session (only one schedule alert):

```text
"ตรวจตาราง วันที่คนน้อย"
```

Cross-session chain unchanged:

```text
"ตรวจตารางงาน" (…) แล้วต่อด้วย "สั่งซื้อสินค้า (9 รายการ)" …
```

## Extensibility

Add new sessions to `SECRETARY_WORK_SESSIONS` without changing guidance/prompt wiring.

## Out of scope

- Merging schedule cards on the board UI
- Auto-completing sibling session tasks when one is marked done
