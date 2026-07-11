# Branch 2 Withdrawal — Design Spec

**Date:** 2026-07-11  
**Status:** Approved (Approach 2 — IN + structured note)  
**Locale:** Thai UI / plain-text LINE output

## Problem

Staff at สาขา 1 travel to สาขา 2 to pick up supplies. Today they manually type a formatted message in LINE every time:

```text
สาขา 1 เบิกของ 11/7/69

1. นมอัลมอนต์ = 3
2. ทิชชู่เล็ก = 1 (ลัง)
...
```

They need an in-app form to enter quantities while picking, then on save: generate copyable LINE text **and** record stock IN for สาขา 1 — without mixing this workflow with Quick Action FAB semantics in the UI (history is still allowed to share the `IN` ledger type).

## Goals

1. Dedicated page for branch-2 withdrawal picking (not FAB / Quick Action).
2. Spreadsheet-style entry: draft locally until explicit Save.
3. One-step Save: generate LINE text + record IN stock atomically.
4. Viewable withdrawal history on the same feature page.
5. Plain-text LINE output for searchability in LINE chat history.

## Non-Goals

- Automatic LINE API send (user copies manually).
- Forced unit conversion between branches.
- Permanent `branch2_unit` column on `inventory_items`.
- New transaction type in `inventory_transactions` (uses standard `IN`).

## Architecture Decision

**Chosen: Approach 2 — standard `IN` transactions + structured note + batch header table.**

| Piece | Role |
| ----- | ---- |
| `inventory_branch_withdrawals` | One row per save: `id`, `line_message`, `created_at`, optional `created_by` |
| `inventory_transactions` | Type `IN`, quantity = สาขา 1 qty, `note` = `[branch2-withdraw:{withdrawal_id}]` |
| Branch-withdraw page history | Query batches table + optional join to transactions by `withdrawal_id` in note |

**Trade-off accepted:** Ledger rows share type `IN` with Quick Action. UI history for this feature filters by batch table / note prefix — not the FAB History modal.

No change to `inventory_transactions_type_check` constraint.

## Route & Navigation

| Item | Value |
| ---- | ----- |
| Route | `/[locale]/inventory/branch-withdraw` |
| Server page | `src/app/[locale]/inventory/branch-withdraw/page.tsx` |
| Client | `src/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx` |
| Entry link | Inventory toolbar (alongside count / accuracy links) |

Follows existing inventory colocation (`count/`, `accuracy/`).

## UI — Grid Columns

All items from `inventory_items`, ordered by `sort_order`.

| Column | Source | Editable |
| ------ | ------ | -------- |
| ลำดับ | `sort_order` | No |
| ชื่อรายการ | `name` | No |
| หน่วย (สาขา 1) | `unit` | No |
| จำนวนเบิก (สาขา 1) | draft state | Yes — drives stock IN |
| จำนวน (สาขา 2) | draft state | Yes — optional LINE qty |
| หน่วย (สาขา 2) | draft state | Yes — optional, per row per session |

### Row inclusion rules

- Empty row (no สาขา 1 qty): ignored entirely.
- No field is required globally; Save with zero qualifying rows shows a lightweight message and does nothing.
- Numeric inputs: same UX as inventory spreadsheet (empty display, sanitize on save).

### Draft persistence

- `sessionStorage` key `inventory-branch-withdraw-draft:v1` while editing.
- Cleared after successful Save.
- Not written to Supabase until Save.

### Save result dialog

After successful Save, `<dialog>` shows:

- Full LINE `line_message` in `<textarea readonly>` or `<pre>`
- **คัดลอก** → `navigator.clipboard.writeText`
- **ปิด** → dismiss

Stock IN already committed in the same action (single-step flow).

## LINE Message Format

Implemented in `src/lib/inventory-branch-withdraw-format.ts`.

### Header

```text
สาขา 1 เบิกของ {date}

```

- `date`: today in `D/M/YY` Buddhist era (2-digit year), e.g. `11/7/69` for 11 Jul 2569.
- Blank line after header.

### Body lines

Only rows with สาขา 1 qty > 0. Renumber sequentially `1.` `2.` `3.` …

Per line:

```text
{n}. {item.name} = {lineQty}{optionalUnitSuffix}
```

| Field | Rule |
| ----- | ---- |
| `lineQty` | สาขา 2 qty if filled and > 0, else สาขา 1 qty |
| `optionalUnitSuffix` | If หน่วย (สาขา 2) non-empty: ` ({unit})` e.g. ` (ลัง)` |
| Formatting | Plain text only — no bold, no markdown |

### Example output

```text
สาขา 1 เบิกของ 11/7/69

1. นมอัลมอนต์ = 3
2. ทิชชู่เล็ก = 1 (ลัง)
```

## Save Flow (Server Action)

**`saveBranchWithdrawal`** in `src/app/actions/inventory-actions.ts` (or colocated `branch-withdraw-actions.ts` if file size warrants).

Input: array of `{ itemId, qtyBranch1, qtyBranch2?, branch2Unit? }` — only rows with `qtyBranch1 > 0`.

Steps (atomic — all or nothing):

1. Auth via `requireMutationAccess()`.
2. Build `line_message` via formatter (server-side mirror of client for integrity).
3. Insert `inventory_branch_withdrawals` → `withdrawal_id`.
4. For each line: `record_inventory_transaction` RPC with `p_type = 'IN'`, `p_quantity = qtyBranch1`, `p_note = '[branch2-withdraw:{withdrawal_id}]'`.
5. On any RPC failure: roll back batch insert (delete withdrawal row + any inserted transactions in same request, or use a single DB transaction via new RPC `record_branch_withdrawal_batch` wrapping steps 3–4).

Prefer **one new RPC** `record_branch_withdrawal_batch` for true atomicity rather than N+1 client calls.

6. `revalidatePath` inventory + branch-withdraw pages.
7. Return `{ success, withdrawalId, lineMessage }`.

### Stock impact

- Quantity always สาขา 1 amount (ชิ้น / unit on item).
- Realtime inventory context refreshes like other IN operations.

## History (Feature-Scoped)

Section on branch-withdraw page: **ประวัติเบิกสาขา 2**

- Lists `inventory_branch_withdrawals` newest first.
- Each row: date/time, line count (from joined transactions or stored `line_count`), actions:
  - **ดูข้อความ LINE** — show stored `line_message`
  - **รายละเอียด** — item names + สาขา 1 qty from transactions joined by note prefix

**FAB History modal:** unchanged — shows all `IN` including branch withdrawals unless we add an optional filter later (out of scope).

## Database Migration

```sql
CREATE TABLE public.inventory_branch_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_message text NOT NULL,
  line_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS: authenticated read; insert via service role / SECURITY DEFINER RPC
```

Optional RPC `record_branch_withdrawal_batch(p_withdrawal jsonb, p_lines jsonb)`:

- Inserts withdrawal header.
- Loops lines with row lock + stock update + transaction insert (`type IN`, structured note).
- Returns `{ withdrawal_id, line_message }`.

## Error Handling

| Case | Behavior |
| ---- | -------- |
| No rows with สาขา 1 qty | Client toast: ไม่มีรายการที่บันทึก |
| Read-only user | Disable Save; show `READ_ONLY_DENY_MSG` |
| RPC / network failure | No partial user-visible success; show error |
| Clipboard failure | Toast fallback; user can select text manually |

## Testing (TDD)

| File | Cases |
| ---- | ----- |
| `src/test/inventory-branch-withdraw-format.test.ts` | Header date, numbering, branch2 qty override, `(unit)` suffix, skip empty rows |
| `src/test/inventory-branch-withdraw-save.test.ts` | Payload filtering, note format, line_count |
| Optional integration | Server action with mocked Supabase |

## Files to Create / Modify (Implementation Preview)

| Path | Action |
| ---- | ------ |
| `supabase/migrations/..._inventory_branch_withdrawals.sql` | Create |
| `sql/record_branch_withdrawal_batch.sql` | Create RPC |
| `src/lib/inventory-branch-withdraw-format.ts` | Create |
| `src/lib/inventory-branch-withdraw-draft.ts` | Create (sessionStorage) |
| `src/app/actions/branch-withdraw-actions.ts` | Create |
| `src/app/[locale]/inventory/branch-withdraw/page.tsx` | Create |
| `src/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx` | Create |
| `src/app/[locale]/inventory/InventoryClient.tsx` | Add nav link |
| `src/test/inventory-branch-withdraw-format.test.ts` | Create |

## Security

- R1: module logic + migration (no RLS overhaul unless required).
- Server Action auth inside action.
- Note prefix is machine-readable, not user-editable on save.

## Open Items Resolved

| Question | Decision |
| -------- | -------- |
| Stock on Save? | Yes — IN สาขา 1 qty |
| LINE qty | สาขา 2 if set, else สาขา 1 |
| Transaction type | Standard `IN` + note |
| Save steps | Single step (B) |
| Branch 2 unit storage | Per-row at withdraw time only |
