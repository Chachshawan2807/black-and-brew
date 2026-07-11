# Branch 2 Withdrawal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/inventory/branch-withdraw` — spreadsheet draft entry, one-step Save that emits LINE plain text and records atomic `IN` stock with `[branch2-withdraw:{id}]` notes plus batch history.

**Architecture:** Pure formatter + sessionStorage draft in `lib/`; `inventory_branch_withdrawals` header table; `record_branch_withdrawal_batch` RPC for atomic multi-line IN; dedicated client page with history section. Standard `IN` ledger type (Approach 2).

**Tech Stack:** Next.js 16 App Router, Supabase (migration + SECURITY DEFINER RPC), Vitest, Tailwind, `<dialog>`, sessionStorage.

**Spec:** `docs/superpowers/specs/2026-07-11-branch-withdraw-design.md`

---

## File map

| File | Responsibility |
| ---- | -------------- |
| `src/lib/inventory-branch-withdraw-format.ts` | LINE text + Buddhist date + note prefix helpers |
| `src/lib/inventory-branch-withdraw-draft.ts` | sessionStorage serialize/parse |
| `src/app/actions/branch-withdraw-actions.ts` | `saveBranchWithdrawal`, `fetchBranchWithdrawalHistory`, `fetchBranchWithdrawalDetail` |
| `supabase/migrations/20260711120000_inventory_branch_withdrawals.sql` | Table + RLS read policy |
| `sql/record_branch_withdrawal_batch.sql` | Atomic batch RPC (mirror in migration) |
| `src/app/[locale]/inventory/branch-withdraw/page.tsx` | RSC shell + initial items/history |
| `src/app/[locale]/inventory/branch-withdraw/loading.tsx` | Loading shell |
| `src/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx` | Grid UI, Save dialog, history |
| `src/lib/menu-list.ts` | Sidebar link |
| `src/test/inventory-branch-withdraw-format.test.ts` | Formatter unit tests |
| `src/test/inventory-branch-withdraw-draft.test.ts` | Draft parse tests |
| `src/test/inventory-branch-withdraw-save.test.ts` | Note prefix + payload filter tests |
| `src/test/inventory-branch-withdraw-menu.test.ts` | Menu route smoke test |

---

### Task 1: LINE formatter (TDD)

**Files:**
- Create: `src/lib/inventory-branch-withdraw-format.ts`
- Create: `src/test/inventory-branch-withdraw-format.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/test/inventory-branch-withdraw-format.test.ts
import { describe, expect, test } from 'vitest';
import {
  BRANCH_WITHDRAW_NOTE_PREFIX,
  buildBranchWithdrawNote,
  formatBranchWithdrawHeaderDate,
  formatBranchWithdrawLineMessage,
  type BranchWithdrawFormatLine,
} from '@/lib/inventory-branch-withdraw-format';

describe('formatBranchWithdrawHeaderDate', () => {
  test('formats D/M/YY Buddhist era', () => {
    expect(formatBranchWithdrawHeaderDate(new Date(2026, 6, 11))).toBe('11/7/69');
  });
});

describe('formatBranchWithdrawLineMessage', () => {
  const baseDate = new Date(2026, 6, 11);

  test('skips rows without branch1 qty and renumbers', () => {
    const lines: BranchWithdrawFormatLine[] = [
      { name: 'นมอัลมอนต์', qtyBranch1: 3, qtyBranch2: null, branch2Unit: null },
      { name: 'ว่าง', qtyBranch1: 0, qtyBranch2: null, branch2Unit: null },
      { name: 'คาราเมล', qtyBranch1: 1, qtyBranch2: null, branch2Unit: null },
    ];
    const text = formatBranchWithdrawLineMessage(lines, baseDate);
    expect(text).toBe(
      'สาขา 1 เบิกของ 11/7/69\n\n1. นมอัลมอนต์ = 3\n2. คาราเมล = 1',
    );
  });

  test('uses branch2 qty in LINE when provided', () => {
    const lines: BranchWithdrawFormatLine[] = [
      { name: 'ทิชชู่เล็ก', qtyBranch1: 24, qtyBranch2: 1, branch2Unit: 'ลัง' },
    ];
    const text = formatBranchWithdrawLineMessage(lines, baseDate);
    expect(text).toContain('1. ทิชชู่เล็ก = 1 (ลัง)');
  });

  test('omits unit suffix when branch2 unit empty', () => {
    const lines: BranchWithdrawFormatLine[] = [
      { name: 'นมอัลมอนต์', qtyBranch1: 3, qtyBranch2: 3, branch2Unit: null },
    ];
    const text = formatBranchWithdrawLineMessage(lines, baseDate);
    expect(text).toContain('1. นมอัลมอนต์ = 3\n');
    expect(text).not.toContain('(');
  });
});

describe('branch withdraw note', () => {
  test('builds stable note prefix', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(buildBranchWithdrawNote(id)).toBe(`${BRANCH_WITHDRAW_NOTE_PREFIX}${id}]`);
    expect(BRANCH_WITHDRAW_NOTE_PREFIX).toBe('[branch2-withdraw:');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/inventory-branch-withdraw-format.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/lib/inventory-branch-withdraw-format.ts
export const BRANCH_WITHDRAW_NOTE_PREFIX = '[branch2-withdraw:';

export type BranchWithdrawFormatLine = {
  name: string;
  qtyBranch1: number;
  qtyBranch2: number | null;
  branch2Unit: string | null;
};

export function formatBranchWithdrawHeaderDate(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const buddhistTwoDigitYear = (date.getFullYear() + 543) % 100;
  return `${day}/${month}/${buddhistTwoDigitYear}`;
}

function resolveLineQty(line: BranchWithdrawFormatLine): number {
  if (line.qtyBranch2 !== null && line.qtyBranch2 > 0) {
    return line.qtyBranch2;
  }
  return line.qtyBranch1;
}

function formatBodyLine(index: number, line: BranchWithdrawFormatLine): string {
  const qty = resolveLineQty(line);
  const unitSuffix =
    line.branch2Unit && line.branch2Unit.trim() !== ''
      ? ` (${line.branch2Unit.trim()})`
      : '';
  return `${index}. ${line.name} = ${qty}${unitSuffix}`;
}

export function formatBranchWithdrawLineMessage(
  lines: BranchWithdrawFormatLine[],
  date: Date = new Date(),
): string {
  const qualifying = lines.filter((line) => line.qtyBranch1 > 0);
  const header = `สาขา 1 เบิกของ ${formatBranchWithdrawHeaderDate(date)}`;
  const body = qualifying.map((line, i) => formatBodyLine(i + 1, line));
  return [header, '', ...body].join('\n');
}

export function buildBranchWithdrawNote(withdrawalId: string): string {
  return `${BRANCH_WITHDRAW_NOTE_PREFIX}${withdrawalId}]`;
}

export function parsePositiveQtyString(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function filterBranchWithdrawSaveLines<
  T extends { itemId: string; name: string; qtyBranch1: string; qtyBranch2: string; branch2Unit: string },
>(rows: T[]): Array<{
  itemId: string;
  name: string;
  qtyBranch1: number;
  qtyBranch2: number | null;
  branch2Unit: string | null;
}> {
  const result: Array<{
    itemId: string;
    name: string;
    qtyBranch1: number;
    qtyBranch2: number | null;
    branch2Unit: string | null;
  }> = [];

  for (const row of rows) {
    const qtyBranch1 = parsePositiveQtyString(row.qtyBranch1);
    if (qtyBranch1 === null) continue;
    const qtyBranch2 = parsePositiveQtyString(row.qtyBranch2);
    const branch2Unit = row.branch2Unit.trim() || null;
    result.push({ itemId: row.itemId, name: row.name, qtyBranch1, qtyBranch2, branch2Unit });
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/test/inventory-branch-withdraw-format.test.ts`
Expected: PASS (3 tests / 4 describe blocks)

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventory-branch-withdraw-format.ts src/test/inventory-branch-withdraw-format.test.ts
git commit -m "feat(inventory): add branch-withdraw LINE formatter"
```

---

### Task 2: Draft sessionStorage helper

**Files:**
- Create: `src/lib/inventory-branch-withdraw-draft.ts`
- Create: `src/test/inventory-branch-withdraw-draft.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/test/inventory-branch-withdraw-draft.test.ts
import { describe, expect, test } from 'vitest';
import {
  BRANCH_WITHDRAW_DRAFT_KEY,
  parseBranchWithdrawDraft,
  serializeBranchWithdrawDraft,
  type BranchWithdrawDraft,
} from '@/lib/inventory-branch-withdraw-draft';

describe('branch withdraw draft', () => {
  test('round-trips draft rows', () => {
    const draft: BranchWithdrawDraft = {
      rows: {
        'item-1': { qtyBranch1: '3', qtyBranch2: '', branch2Unit: '' },
        'item-2': { qtyBranch1: '24', qtyBranch2: '1', branch2Unit: 'ลัง' },
      },
    };
    const parsed = parseBranchWithdrawDraft(serializeBranchWithdrawDraft(draft));
    expect(parsed).toEqual(draft);
  });

  test('rejects invalid payload', () => {
    expect(parseBranchWithdrawDraft('not-json')).toBeNull();
    expect(parseBranchWithdrawDraft('{}')).toBeNull();
  });

  test('exports stable storage key', () => {
    expect(BRANCH_WITHDRAW_DRAFT_KEY).toBe('inventory-branch-withdraw-draft:v1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/inventory-branch-withdraw-draft.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```typescript
// src/lib/inventory-branch-withdraw-draft.ts
export const BRANCH_WITHDRAW_DRAFT_KEY = 'inventory-branch-withdraw-draft:v1';

export type BranchWithdrawDraftRow = {
  qtyBranch1: string;
  qtyBranch2: string;
  branch2Unit: string;
};

export type BranchWithdrawDraft = {
  rows: Record<string, BranchWithdrawDraftRow>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDraftRow(value: unknown): value is BranchWithdrawDraftRow {
  if (!isRecord(value)) return false;
  return (
    typeof value.qtyBranch1 === 'string' &&
    typeof value.qtyBranch2 === 'string' &&
    typeof value.branch2Unit === 'string'
  );
}

export function serializeBranchWithdrawDraft(draft: BranchWithdrawDraft): string {
  return JSON.stringify(draft);
}

export function parseBranchWithdrawDraft(raw: string): BranchWithdrawDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.rows)) return null;
    for (const row of Object.values(parsed.rows)) {
      if (!isDraftRow(row)) return null;
    }
    return { rows: parsed.rows as Record<string, BranchWithdrawDraftRow> };
  } catch {
    return null;
  }
}

export function readBranchWithdrawDraft(storage: Storage): BranchWithdrawDraft | null {
  const raw = storage.getItem(BRANCH_WITHDRAW_DRAFT_KEY);
  if (!raw) return null;
  return parseBranchWithdrawDraft(raw);
}

export function writeBranchWithdrawDraft(storage: Storage, draft: BranchWithdrawDraft): void {
  storage.setItem(BRANCH_WITHDRAW_DRAFT_KEY, serializeBranchWithdrawDraft(draft));
}

export function clearBranchWithdrawDraft(storage: Storage): void {
  storage.removeItem(BRANCH_WITHDRAW_DRAFT_KEY);
}

export function emptyDraftRow(): BranchWithdrawDraftRow {
  return { qtyBranch1: '', qtyBranch2: '', branch2Unit: '' };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/inventory-branch-withdraw-draft.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventory-branch-withdraw-draft.ts src/test/inventory-branch-withdraw-draft.test.ts
git commit -m "feat(inventory): add branch-withdraw session draft helper"
```

---

### Task 3: Save payload smoke tests

**Files:**
- Create: `src/test/inventory-branch-withdraw-save.test.ts`

- [ ] **Step 1: Write test**

```typescript
// src/test/inventory-branch-withdraw-save.test.ts
import { describe, expect, test } from 'vitest';
import {
  buildBranchWithdrawNote,
  filterBranchWithdrawSaveLines,
  formatBranchWithdrawLineMessage,
} from '@/lib/inventory-branch-withdraw-format';

describe('branch withdraw save payload', () => {
  test('filter keeps only rows with branch1 qty', () => {
    const rows = filterBranchWithdrawSaveLines([
      { itemId: 'a', name: 'A', qtyBranch1: '2', qtyBranch2: '', branch2Unit: '' },
      { itemId: 'b', name: 'B', qtyBranch1: '', qtyBranch2: '9', branch2Unit: 'ลัง' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemId).toBe('a');
  });

  test('server rebuilds same line message as client filter', () => {
    const rows = filterBranchWithdrawSaveLines([
      { itemId: 'a', name: 'ทิชชู่เล็ก', qtyBranch1: '24', qtyBranch2: '1', branch2Unit: 'ลัง' },
    ]);
    const message = formatBranchWithdrawLineMessage(rows, new Date(2026, 6, 11));
    expect(message).toContain('1. ทิชชู่เล็ก = 1 (ลัง)');
  });

  test('note embeds withdrawal id', () => {
    const id = '11111111-1111-1111-1111-111111111111';
    expect(buildBranchWithdrawNote(id)).toBe('[branch2-withdraw:11111111-1111-1111-1111-111111111111]');
  });
});
```

- [ ] **Step 2: Run test**

Run: `npm test -- src/test/inventory-branch-withdraw-save.test.ts`
Expected: PASS (depends on Task 1)

- [ ] **Step 3: Commit**

```bash
git add src/test/inventory-branch-withdraw-save.test.ts
git commit -m "test(inventory): cover branch-withdraw save payload rules"
```

---

### Task 4: Database migration + RPC

**Files:**
- Create: `supabase/migrations/20260711120000_inventory_branch_withdrawals.sql`
- Create: `sql/record_branch_withdrawal_batch.sql`

- [ ] **Step 1: Add migration**

```sql
-- supabase/migrations/20260711120000_inventory_branch_withdrawals.sql
CREATE TABLE public.inventory_branch_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_message text NOT NULL,
  line_count integer NOT NULL CHECK (line_count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_inventory_branch_withdrawals_created_at
  ON public.inventory_branch_withdrawals (created_at DESC);

ALTER TABLE public.inventory_branch_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_branch_withdrawals"
  ON public.inventory_branch_withdrawals
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.inventory_branch_withdrawals IS
  'Header row per branch-2 pickup batch; LINE message stored for history replay.';

CREATE OR REPLACE FUNCTION public.record_branch_withdrawal_batch(
  p_line_message text,
  p_lines jsonb
) RETURNS json AS $$
DECLARE
  v_withdrawal_id uuid;
  v_line jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_note text;
  v_current_stock numeric;
  v_new_stock numeric;
BEGIN
  IF p_line_message IS NULL OR btrim(p_line_message) = '' THEN
    RAISE EXCEPTION 'line_message is required';
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'p_lines must be a non-empty array';
  END IF;

  INSERT INTO public.inventory_branch_withdrawals (line_message, line_count)
  VALUES (p_line_message, jsonb_array_length(p_lines))
  RETURNING id INTO v_withdrawal_id;

  v_note := '[branch2-withdraw:' || v_withdrawal_id::text || ']';

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_item_id := (v_line->>'item_id')::uuid;
    v_quantity := (v_line->>'quantity')::numeric;

    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'Each line requires item_id';
    END IF;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Each line requires quantity > 0';
    END IF;

    SELECT COALESCE(stock, 0) INTO v_current_stock
    FROM public.inventory_items
    WHERE id = v_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found (ID: %)', v_item_id;
    END IF;

    v_new_stock := v_current_stock + v_quantity;

    UPDATE public.inventory_items
    SET stock = v_new_stock
    WHERE id = v_item_id;

    INSERT INTO public.inventory_transactions (
      inventory_item_id,
      type,
      quantity,
      note,
      balance_after
    )
    VALUES (
      v_item_id,
      'IN',
      v_quantity,
      v_note,
      v_new_stock
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'line_message', p_line_message
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public;
```

- [ ] **Step 2: Copy RPC to `sql/record_branch_withdrawal_batch.sql`** (same function body + header comment mirroring `sql/record_inventory_transaction.sql` style)

- [ ] **Step 3: Verify migration file list**

Run: `npm run db:verify`
Expected: migration listed without errors (or document manual `supabase db push` if local stack used)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260711120000_inventory_branch_withdrawals.sql sql/record_branch_withdrawal_batch.sql
git commit -m "feat(db): add branch withdrawal batch table and RPC"
```

---

### Task 5: Server actions

**Files:**
- Create: `src/app/actions/branch-withdraw-actions.ts`

- [ ] **Step 1: Implement actions**

```typescript
// src/app/actions/branch-withdraw-actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireMutationAccess, requireReadAccess } from '@/lib/policies/server-gate';
import {
  filterBranchWithdrawSaveLines,
  formatBranchWithdrawLineMessage,
  buildBranchWithdrawNote,
  BRANCH_WITHDRAW_NOTE_PREFIX,
} from '@/lib/inventory-branch-withdraw-format';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const saveLineSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1),
  qtyBranch1: z.string(),
  qtyBranch2: z.string(),
  branch2Unit: z.string(),
});

const saveSchema = z.object({
  lines: z.array(saveLineSchema),
});

export type BranchWithdrawHistoryRow = {
  id: string;
  line_message: string;
  line_count: number;
  created_at: string;
};

export type BranchWithdrawDetailLine = {
  itemName: string;
  quantity: number;
  created_at: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function saveBranchWithdrawal(raw: z.infer<typeof saveSchema>) {
  try {
    const authError = await requireMutationAccess();
    if (authError) return { success: false as const, error: authError };

    const parsed = saveSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false as const, error: 'ข้อมูลไม่ถูกต้อง' };
    }

    const filtered = filterBranchWithdrawSaveLines(parsed.data.lines);
    if (filtered.length === 0) {
      return { success: false as const, error: 'ไม่มีรายการที่บันทึก' };
    }

    const lineMessage = formatBranchWithdrawLineMessage(filtered);
    const rpcLines = filtered.map((line) => ({
      item_id: line.itemId,
      quantity: line.qtyBranch1,
    }));

    const { data, error } = await supabase.rpc('record_branch_withdrawal_batch', {
      p_line_message: lineMessage,
      p_lines: rpcLines,
    });

    if (error) {
      console.error('[saveBranchWithdrawal] Supabase RPC Error:', error.message, error.details, error.hint);
      return { success: false as const, error: error.message };
    }

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/branch-withdraw', 'page');

    return {
      success: true as const,
      withdrawalId: data?.withdrawal_id as string,
      lineMessage: (data?.line_message as string) ?? lineMessage,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[saveBranchWithdrawal] Unexpected Error:', message);
    return { success: false as const, error: message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

export async function fetchBranchWithdrawalHistory(limit = 30) {
  try {
    const authError = await requireReadAccess();
    if (authError) return { success: false as const, error: authError, data: [] as BranchWithdrawHistoryRow[] };

    const { data, error } = await supabase
      .from('inventory_branch_withdrawals')
      .select('id, line_message, line_count, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[fetchBranchWithdrawalHistory] Supabase Error:', error.message, error.details);
      return { success: false as const, error: error.message, data: [] as BranchWithdrawHistoryRow[] };
    }

    return { success: true as const, data: (data ?? []) as BranchWithdrawHistoryRow[] };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error), data: [] as BranchWithdrawHistoryRow[] };
  }
}

export async function fetchBranchWithdrawalDetail(withdrawalId: string) {
  try {
    const authError = await requireReadAccess();
    if (authError) return { success: false as const, error: authError };

    const note = buildBranchWithdrawNote(withdrawalId);

    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('quantity, created_at, inventory_items(name)')
      .eq('type', 'IN')
      .eq('note', note)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[fetchBranchWithdrawalDetail] Supabase Error:', error.message, error.details);
      return { success: false as const, error: error.message };
    }

    const lines: BranchWithdrawDetailLine[] = (data ?? []).map((row) => ({
      itemName: (row.inventory_items as { name?: string } | null)?.name ?? '—',
      quantity: Number(row.quantity) || 0,
      created_at: row.created_at as string,
    }));

    return { success: true as const, data: lines };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export { BRANCH_WITHDRAW_NOTE_PREFIX };
```

- [ ] **Step 2: Run lint on new file**

Run: `npx eslint src/app/actions/branch-withdraw-actions.ts --max-warnings 0`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/branch-withdraw-actions.ts
git commit -m "feat(inventory): add branch-withdraw server actions"
```

---

### Task 6: Branch withdraw client UI

**Files:**
- Create: `src/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx`

- [ ] **Step 1: Implement client** (pattern from `InventoryCountClient.tsx` — spreadsheet inputs, `useReadOnly`, `useInventoryRealtime` for post-save refresh)

Key behaviors:
- Props: `initialItems: { id, name, unit, sort_order }[]`, `initialHistory: BranchWithdrawHistoryRow[]`, `locale`
- State: `draft.rows` merged from sessionStorage on mount; `useEffect` persists draft on change
- Table columns: ลำดับ, ชื่อ, หน่วย (สาขา 1), จำนวนเบิก (สาขา 1), จำนวน (สาขา 2), หน่วย (สาขา 2)
- Numeric inputs: `type="text"` `inputMode="numeric"` display empty when `""`; strip leading zeros per ERP rules
- Sticky footer **บันทึก** button with `env(safe-area-inset-bottom)`
- `handleSave`: call `saveBranchWithdrawal`; on success `clearBranchWithdrawDraft`, `refresh()` from realtime context, open `<dialog>` with readonly textarea + **คัดลอก** / **ปิด**
- History section below grid: list `initialHistory`; **ดูข้อความ LINE** opens dialog with `line_message`; **รายละเอียด** calls `fetchBranchWithdrawalDetail`
- Back link: `/${locale}/inventory`
- Title: `เบิกของจากสาขา 2`

Minimal numeric input helper (inline in client file):

```typescript
function displayQty(value: string): string {
  return value === '' ? '' : value;
}

function sanitizeQtyInput(raw: string): string {
  const stripped = raw.replace(/[^\d.]/g, '');
  if (stripped === '') return '';
  return stripped.replace(/^0+(?=\d)/, '');
}
```

- [ ] **Step 2: Manual smoke** — dev server → `/th/inventory/branch-withdraw` (after Task 7), enter qty, Save, verify dialog text + stock bump on `/inventory`

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx
git commit -m "feat(inventory): add branch-withdraw client page"
```

---

### Task 7: RSC page + loading

**Files:**
- Create: `src/app/[locale]/inventory/branch-withdraw/page.tsx`
- Create: `src/app/[locale]/inventory/branch-withdraw/loading.tsx`

- [ ] **Step 1: page.tsx**

```typescript
import { redirect } from 'next/navigation';
import { checkAuth } from '@/app/actions/auth';
import { fetchBranchWithdrawalHistory } from '@/app/actions/branch-withdraw-actions';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { INVENTORY_COUNT_SELECT } from '@/lib/inventory-queries';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const BranchWithdrawClient = createLazyFeatureClient(
  () => import('./BranchWithdrawClient'),
  'กำลังโหลดหน้าเบิกของจากสาขา 2...',
);

export default async function BranchWithdrawPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) redirect(`/${locale}`);

  const [itemsResult, historyResult] = await Promise.all([
    getSupabaseAdmin()
      .from('inventory_items')
      .select(INVENTORY_COUNT_SELECT)
      .order('sort_order', { ascending: true }),
    fetchBranchWithdrawalHistory(30),
  ]);

  if (itemsResult.error) {
    console.error('Supabase Error (Branch Withdraw Fetch):', itemsResult.error.message, itemsResult.error.details);
  }

  return (
    <BranchWithdrawClient
      initialItems={itemsResult.data ?? []}
      initialHistory={historyResult.success ? historyResult.data : []}
      locale={locale}
    />
  );
}
```

- [ ] **Step 2: loading.tsx** — copy pattern from `src/app/[locale]/inventory/count/loading.tsx` with Thai label `กำลังโหลดหน้าเบิกของจากสาขา 2...`

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/inventory/branch-withdraw/page.tsx src/app/[locale]/inventory/branch-withdraw/loading.tsx
git commit -m "feat(inventory): add branch-withdraw route shell"
```

---

### Task 8: Navigation

**Files:**
- Modify: `src/lib/menu-list.ts`
- Create: `src/test/inventory-branch-withdraw-menu.test.ts`

- [ ] **Step 1: Add menu item** after inventory-accuracy entry:

```typescript
{
  id: 'inventory-branch-withdraw',
  href: `${prefix}/inventory/branch-withdraw`,
  label: 'เบิกของจากสาขา 2',
  active: pathname.includes('/inventory/branch-withdraw'),
  icon: Package, // or Truck if imported from lucide-react
  submenus: []
},
```

- [ ] **Step 2: Exclude from main inventory active state** — update inventory item `active` predicate:

```typescript
active:
  pathname.includes('/inventory') &&
  !pathname.includes('/inventory/count') &&
  !pathname.includes('/inventory/accuracy') &&
  !pathname.includes('/inventory/branch-withdraw'),
```

- [ ] **Step 3: Menu smoke test**

```typescript
import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('branch withdraw navigation', () => {
  test('menu lists branch-withdraw route', () => {
    const menu = fs.readFileSync(path.resolve(__dirname, '../lib/menu-list.ts'), 'utf-8');
    expect(menu).toContain('/inventory/branch-withdraw');
    expect(menu).toContain('เบิกของจากสาขา 2');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/inventory-branch-withdraw-menu.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/menu-list.ts src/test/inventory-branch-withdraw-menu.test.ts
git commit -m "feat(nav): add branch-withdraw sidebar link"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full unit suite for new files**

Run: `npm test -- src/test/inventory-branch-withdraw-format.test.ts src/test/inventory-branch-withdraw-draft.test.ts src/test/inventory-branch-withdraw-save.test.ts src/test/inventory-branch-withdraw-menu.test.ts`
Expected: all PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Apply migration** (local/remote per team workflow)

Run: `supabase db push` or deploy migration via CI

- [ ] **Step 4: Manual test checklist**

1. Open `/th/inventory/branch-withdraw`
2. Enter สาขา 1 qty only → LINE uses same qty, IN uses สาขา 1 qty
3. Enter สาขา 1 + สาขา 2 + unit → LINE shows สาขา 2 qty with `(unit)`
4. Refresh mid-edit → draft restored from sessionStorage
5. Save → dialog copy works; stock updates on inventory page
6. History shows batch; detail lists IN lines
7. Read-only user cannot Save

- [ ] **Step 5: Commit any fixes**

```bash
git commit -m "fix(inventory): branch-withdraw polish from verification"
```

---

## Spec coverage checklist

| Spec requirement | Task |
| ---------------- | ---- |
| Route `/inventory/branch-withdraw` | Task 7 |
| Spreadsheet dual qty + branch2 unit | Task 6 |
| sessionStorage draft | Task 2, 6 |
| LINE plain text format | Task 1 |
| Single-step Save + copy dialog | Task 6 |
| IN stock สาขา 1 qty | Task 4 RPC, 5 |
| Note `[branch2-withdraw:id]` | Task 1, 4, 5 |
| Atomic batch | Task 4 RPC |
| Feature-scoped history | Task 5, 6 |
| No new transaction type | Task 4 (type `IN`) |
| Sidebar entry | Task 8 |
| TDD formatter | Task 1–3 |
| Read-only guard | Task 5, 6 |

## Risk notes

- **Migration required (R1):** deploy `20260711120000_inventory_branch_withdrawals.sql` before server action works in prod.
- **RPC atomicity:** single Postgres function — failure rolls back entire transaction automatically.
- **Notifications:** branch-withdraw IN does not pass `notificationSource` quick-action flags — stock notifications may still fire via realtime; acceptable per spec (out of scope).
