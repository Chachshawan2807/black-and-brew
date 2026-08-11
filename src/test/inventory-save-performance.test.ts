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
const inventoryClient = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
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

  test('warehouse stock edit does not block on a pre-mutation item SELECT', () => {
    const critical = criticalPathBeforeAfter('updateInventoryStock', inventoryActions);
    expect(critical).not.toMatch(/\.from\(['"]inventory_items['"]\)[\s\S]*\.select\(/);
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
    expect(critical).not.toContain('scheduleProactiveInsightEvaluation');
  });

  test('stock mutations schedule debounced proactive insight evaluation', () => {
    expect(inventoryActions).toContain('scheduleProactiveInsightEvaluation');
    expect(inventoryActions).toMatch(
      /deferInventorySideEffects\('recordTransaction'[\s\S]*scheduleProactiveInsightEvaluation\('inventory_update'\)/,
    );
    expect(inventoryActions).toMatch(
      /deferInventorySideEffects\('updateInventoryStock'[\s\S]*scheduleProactiveInsightEvaluation\('inventory_update'\)/,
    );
  });

  test('recordTransaction does not block on a pre-mutation item SELECT', () => {
    const critical = criticalPathBeforeAfter('recordTransaction', inventoryActions);
    expect(critical).not.toMatch(/\.from\(['"]inventory_items['"]\)[\s\S]*\.select\(/);
  });

  test('bulk transactions do not SELECT item metadata on the critical path', () => {
    const critical = criticalPathBeforeAfter('recordBulkInventoryTransactions', inventoryActions);
    expect(critical).not.toMatch(/\.from\(['"]inventory_items['"]\)[\s\S]*\.select\(/);
    expect(critical).not.toContain('revalidatePath');
    expect(inventoryActions).toContain("deferInventorySideEffects('recordBulkInventoryTransactions'");
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
    expect(branchWithdrawClient).toContain('Promise.all');
  });

  test('warehouse field edit uses one inventory_items query on the critical path', () => {
    const critical = criticalPathBeforeAfter('updateInventoryItemField', inventoryActions);
    expect((critical.match(/from\('inventory_items'\)/g) ?? []).length).toBe(1);
    expect(critical).toContain('.update(');
  });

  test('deleteInventoryItem defers audit log and revalidation', () => {
    const fnStart = inventoryActions.indexOf('export async function deleteInventoryItem');
    const fnEnd = inventoryActions.indexOf('export async function deleteInventoryItemsBulk');
    const fnBody = inventoryActions.slice(fnStart, fnEnd);
    const successDefer = fnBody.indexOf("deferInventorySideEffects('deleteInventoryItem'");
    expect(successDefer).toBeGreaterThan(-1);
    expect(fnBody.slice(successDefer)).toContain('recordDataChange');
    expect(fnBody.slice(successDefer)).toContain('revalidateInventoryPaths');
    expect(fnBody.slice(0, successDefer)).not.toContain('await recordDataChange');
  });

  test('fetchCountAccuracyStats bounds verification scan', () => {
    expect(inventoryActions).toContain('COUNT_ACCURACY_VERIFICATION_LIMIT');
    expect(inventoryActions).toMatch(
      /inventory_count_verifications[\s\S]*\.limit\(COUNT_ACCURACY_VERIFICATION_LIMIT\)/,
    );
  });

  test('purchase order modal does not refetch full inventory on open', () => {
    const openPo = inventoryClient.match(
      /const handleOpenPurchaseOrders = useCallback\([\s\S]*?\}, \[[^\]]*\]\);/,
    )?.[0];
    expect(openPo).toBeTruthy();
    expect(openPo).not.toContain('fetchConfigAndInventory');
  });

  test('inventory grid save field handler avoids items dependency churn', () => {
    expect(inventoryClient).toContain('itemsRef');
    expect(inventoryClient).toMatch(/const totalItems = itemsRef\.current\.length/);
    expect(inventoryClient).toMatch(/previousFieldValue:/);
  });
});
