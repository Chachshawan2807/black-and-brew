import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const inventoryActions = fs.readFileSync(
  path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
  'utf-8',
);
const branchWithdrawActions = fs.readFileSync(
  path.resolve(__dirname, '../app/actions/branch-withdraw-actions.ts'),
  'utf-8',
);
const branchWithdrawClient = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
  'utf-8',
);

function criticalPathBeforeAfter(fnName: string, source: string): string {
  const fnStart = source.indexOf(`export async function ${fnName}`);
  expect(fnStart).toBeGreaterThan(-1);
  const fnEnd = source.indexOf('\nexport async function ', fnStart + 1);
  const fnBody = source.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
  const afterIdx = fnBody.indexOf('deferInventorySideEffects(');
  if (afterIdx === -1) {
    return fnBody;
  }
  return fnBody.slice(0, afterIdx);
}

describe('inventory save performance', () => {
  test('warehouse stock edit defers audit log and revalidation', () => {
    const critical = criticalPathBeforeAfter('updateInventoryStock', inventoryActions);
    expect(critical).not.toContain('recordDataChange');
    expect(critical).not.toContain('revalidatePath');
    expect(inventoryActions).toContain('deferInventorySideEffects(');
  });

  test('warehouse field edit defers audit log and revalidation', () => {
    const critical = criticalPathBeforeAfter('updateInventoryItemField', inventoryActions);
    expect(critical).not.toContain('recordDataChange');
    expect(critical).not.toContain('revalidatePath');
  });

  test('recordTransaction defers audit log and revalidation', () => {
    const critical = criticalPathBeforeAfter('recordTransaction', inventoryActions);
    expect(critical).not.toContain('await recordDataChange');
    expect(critical).not.toContain('revalidatePath');
  });

  test('reorderInventoryItems defers audit log and revalidation', () => {
    const critical = criticalPathBeforeAfter('reorderInventoryItems', inventoryActions);
    expect(critical).not.toContain('await recordDataChange');
    expect(critical).not.toContain('revalidatePath');
  });

  test('branch withdraw save defers notifications and revalidation', () => {
    expect(branchWithdrawActions).toContain("import { after } from 'next/server'");
    const fnStart = branchWithdrawActions.indexOf('export async function saveBranchWithdrawal');
    const fnEnd = branchWithdrawActions.indexOf('export async function fetchBranchWithdrawalHistory');
    const fnBody = branchWithdrawActions.slice(fnStart, fnEnd);
    const afterIdx = fnBody.indexOf('after(async () => {');
    expect(afterIdx).toBeGreaterThan(-1);
    const critical = fnBody.slice(0, afterIdx);
    expect(critical).not.toContain('recordBranchWithdrawInventoryNotifications');
    expect(critical).not.toContain('revalidatePath');
    expect(fnBody.slice(afterIdx)).toContain('recordBranchWithdrawInventoryNotifications');
  });

  test('branch withdraw client shows success before background refresh', () => {
    expect(branchWithdrawClient).toMatch(/openDialog\(saveResultDialogRef\.current\)/);
    expect(branchWithdrawClient).toMatch(/void[\s\S]*refresh\(\)/);
    expect(branchWithdrawClient).not.toMatch(
      /await refresh\(\)[\s\S]*openDialog\(saveResultDialogRef\.current\)/,
    );
  });
});
