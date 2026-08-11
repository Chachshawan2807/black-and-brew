import { describe, expect, test } from 'vitest';
import {
  addBulkQueueItem,
  canSubmitBulkQueue,
  computeBulkPreview,
  computeOptimisticStockAfterTransaction,
  formatBulkConfirmQty,
  getBulkSubmitTypeLabel,
  resolveBulkSubmitPayload,
  resolveInOutQuantity,
  setBulkLineQty,
  type BulkQueueItem,
  type BulkStockItem,
} from '@/lib/inventory-quick-bulk';

const items: BulkStockItem[] = [
  { id: 'a1', name: 'นมสด', stock: 12, unit: 'กล่อง' },
  { id: 'b2', name: 'กาแฟอาราบิกา', stock: 3, unit: 'kg' },
  { id: 'c3', name: 'น้ำตาล', stock: 1, unit: 'kg' },
];

describe('inventory-quick-bulk', () => {
  test('resolveInOutQuantity treats empty as 1 and rejects non-positive values', () => {
    expect(resolveInOutQuantity('')).toBe(1);
    expect(resolveInOutQuantity('   ')).toBe(1);
    expect(resolveInOutQuantity('3')).toBe(3);
    expect(resolveInOutQuantity('0')).toBeNull();
    expect(resolveInOutQuantity('-2')).toBeNull();
    expect(resolveInOutQuantity('abc')).toBeNull();
  });

  test('computeOptimisticStockAfterTransaction applies IN/OUT/ADJUST rules', () => {
    expect(computeOptimisticStockAfterTransaction(5, 'IN', 1)).toBe(6);
    expect(computeOptimisticStockAfterTransaction(5, 'OUT', 2)).toBe(3);
    expect(computeOptimisticStockAfterTransaction(1, 'OUT', 2)).toBeNull();
    expect(computeOptimisticStockAfterTransaction(5, 'ADJUST', 8)).toBe(8);
  });

  test('getBulkSubmitTypeLabel returns Thai labels for IN, OUT, and ADJUST', () => {
    expect(getBulkSubmitTypeLabel('IN')).toBe('รับเข้า');
    expect(getBulkSubmitTypeLabel('OUT')).toBe('นำออก');
    expect(getBulkSubmitTypeLabel('ADJUST')).toBe('ปรับจำนวน');
  });

  test('addBulkQueueItem deduplicates by item id', () => {
    const first = addBulkQueueItem([], items[0]!);
    expect(first.queue).toHaveLength(1);
    const second = addBulkQueueItem(first.queue, items[0]!);
    expect(second.queue).toHaveLength(1);
    expect(second.duplicate).toBe(true);
  });

  test('addBulkQueueItem puts newest items first', () => {
    const first = addBulkQueueItem([], items[0]!);
    const second = addBulkQueueItem(first.queue, items[1]!);
    expect(second.queue.map((line) => line.itemId)).toEqual(['b2', 'a1']);
  });

  test('computeBulkPreview IN adds qty to current stock', () => {
    const line: BulkQueueItem = {
      itemId: 'a1',
      name: 'นมสด',
      unit: 'กล่อง',
      currentStock: 12,
      qty: '5',
    };
    const preview = computeBulkPreview(line, 'IN');
    expect(preview.after).toBe(17);
    expect(preview.error).toBeUndefined();
  });

  test('computeBulkPreview OUT subtracts and blocks negative stock', () => {
    const ok: BulkQueueItem = {
      itemId: 'c3',
      name: 'น้ำตาล',
      unit: 'kg',
      currentStock: 1,
      qty: '1',
    };
    expect(computeBulkPreview(ok, 'OUT').after).toBe(0);

    const bad: BulkQueueItem = { ...ok, qty: '2' };
    expect(computeBulkPreview(bad, 'OUT').error).toMatch(/ไม่พอ/);
  });

  test('empty qty defaults to 1 for IN/OUT preview and submit', () => {
    const line: BulkQueueItem = {
      itemId: 'a1',
      name: 'นมสด',
      unit: 'กล่อง',
      currentStock: 12,
      qty: '',
    };
    expect(computeBulkPreview(line, 'IN')).toEqual({
      itemId: 'a1',
      before: 12,
      after: 13,
    });
    expect(computeBulkPreview(line, 'OUT')).toEqual({
      itemId: 'a1',
      before: 12,
      after: 11,
    });
    expect(canSubmitBulkQueue([line], 'IN')).toBe(true);
    expect(resolveBulkSubmitPayload([line], 'IN')).toEqual([
      { itemId: 'a1', type: 'IN', quantity: 1 },
    ]);
  });

  test('computeBulkPreview ADJUST sets absolute stock and requires explicit qty', () => {
    const line: BulkQueueItem = {
      itemId: 'a1',
      name: 'นมสด',
      unit: 'กล่อง',
      currentStock: 12,
      qty: '',
    };
    expect(computeBulkPreview(line, 'ADJUST').error).toMatch(/คงเหลือใหม่/);

    const withQty = { ...line, qty: '8' };
    expect(computeBulkPreview(withQty, 'ADJUST')).toEqual({
      itemId: 'a1',
      before: 12,
      after: 8,
    });
    expect(computeBulkPreview({ ...line, qty: '0' }, 'ADJUST').after).toBe(0);
  });

  test('resolveBulkSubmitPayload ADJUST uses new stock levels', () => {
    const queue: BulkQueueItem[] = [
      {
        itemId: 'a1',
        name: 'นมสด',
        unit: 'กล่อง',
        currentStock: 12,
        qty: '8',
      },
    ];
    expect(resolveBulkSubmitPayload(queue, 'ADJUST')).toEqual([
      { itemId: 'a1', type: 'ADJUST', quantity: 8 },
    ]);
    expect(canSubmitBulkQueue(queue, 'ADJUST')).toBe(true);
    expect(canSubmitBulkQueue([{ ...queue[0]!, qty: '' }], 'ADJUST')).toBe(false);
  });

  test('formatBulkConfirmQty shows resolved quantity so empty defaults display as 1 for IN/OUT', () => {
    expect(formatBulkConfirmQty('')).toBe('1');
    expect(formatBulkConfirmQty('   ')).toBe('1');
    expect(formatBulkConfirmQty('3')).toBe('3');
    expect(formatBulkConfirmQty('0')).toBe('0');
    expect(formatBulkConfirmQty('', 'ADJUST')).toBe('');
  });

  test('canSubmitBulkQueue rejects invalid non-empty qty', () => {
    const queue: BulkQueueItem[] = [
      {
        itemId: 'a1',
        name: 'นมสด',
        unit: 'กล่อง',
        currentStock: 12,
        qty: '2',
      },
      {
        itemId: 'b2',
        name: 'กาแฟอาราบิกา',
        unit: 'kg',
        currentStock: 3,
        qty: '0',
      },
    ];
    expect(canSubmitBulkQueue(queue, 'IN')).toBe(false);
    expect(canSubmitBulkQueue([{ ...queue[0]! }], 'IN')).toBe(true);
  });

  test('setBulkLineQty updates only matching row', () => {
    const queue: BulkQueueItem[] = [
      {
        itemId: 'a1',
        name: 'นมสด',
        unit: 'กล่อง',
        currentStock: 12,
        qty: '',
      },
    ];
    const next = setBulkLineQty(queue, 'a1', '3');
    expect(next[0]?.qty).toBe('3');
  });
});
