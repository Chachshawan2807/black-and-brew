import { describe, expect, test } from 'vitest';
import {
  addBulkQueueItem,
  buildBulkQueueFromPaste,
  canSubmitBulkQueue,
  computeBulkPreview,
  getBulkSubmitTypeLabel,
  parseBulkPasteNames,
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
  test('getBulkSubmitTypeLabel returns Thai labels for IN and OUT', () => {
    expect(getBulkSubmitTypeLabel('IN')).toBe('รับเข้า');
    expect(getBulkSubmitTypeLabel('OUT')).toBe('นำออก');
  });

  test('parseBulkPasteNames splits newline and comma separated names', () => {
    expect(parseBulkPasteNames('นมสด\nกาแฟอาราบิกา, น้ำตาล')).toEqual([
      'นมสด',
      'กาแฟอาราบิกา',
      'น้ำตาล',
    ]);
    expect(parseBulkPasteNames('  \n  ')).toEqual([]);
  });

  test('buildBulkQueueFromPaste resolves exact names and skips unknown', () => {
    const { queue, added, unknownNames } = buildBulkQueueFromPaste('นมสด\nไม่มีในระบบ', items, []);
    expect(added).toHaveLength(1);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.itemId).toBe('a1');
    expect(unknownNames).toEqual(['ไม่มีในระบบ']);
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

  test('buildBulkQueueFromPaste keeps last pasted line at top', () => {
    const { queue } = buildBulkQueueFromPaste('นมสด\nกาแฟอาราบิกา', items, []);
    expect(queue.map((line) => line.itemId)).toEqual(['b2', 'a1']);
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

  test('canSubmitBulkQueue requires every line to have valid qty', () => {
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
        qty: '',
      },
    ];
    expect(canSubmitBulkQueue(queue, 'IN')).toBe(false);
    expect(canSubmitBulkQueue([{ ...queue[0]!, qty: '2' }], 'IN')).toBe(true);
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
