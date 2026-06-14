/** Bulk IN/OUT queue for inventory quick action — names only on paste; qty per row. */

export type BulkStockItem = {
  id: string;
  name: string;
  stock: number;
  unit: string;
};

export type BulkQueueItem = {
  itemId: string;
  name: string;
  unit: string;
  currentStock: number;
  qty: string;
};

export type BulkPreview = {
  itemId: string;
  before: number;
  after: number;
  error?: string;
};

export type BulkQuickType = 'IN' | 'OUT';

export function parseBulkPasteNames(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findItemByExactName(items: BulkStockItem[], name: string): BulkStockItem | undefined {
  const needle = name.trim();
  if (!needle) return undefined;
  return items.find((item) => item.name === needle);
}

export function toBulkQueueItem(item: BulkStockItem): BulkQueueItem {
  return {
    itemId: item.id,
    name: item.name,
    unit: item.unit,
    currentStock: Number(item.stock) || 0,
    qty: '',
  };
}

export function addBulkQueueItem(
  queue: BulkQueueItem[],
  item: BulkStockItem,
): { queue: BulkQueueItem[]; duplicate: boolean } {
  if (queue.some((line) => line.itemId === item.id)) {
    return { queue, duplicate: true };
  }
  return { queue: [...queue, toBulkQueueItem(item)], duplicate: false };
}

export function removeBulkQueueItem(queue: BulkQueueItem[], itemId: string): BulkQueueItem[] {
  return queue.filter((line) => line.itemId !== itemId);
}

export function setBulkLineQty(queue: BulkQueueItem[], itemId: string, qty: string): BulkQueueItem[] {
  return queue.map((line) => (line.itemId === itemId ? { ...line, qty } : line));
}

export function buildBulkQueueFromPaste(
  text: string,
  items: BulkStockItem[],
  existingQueue: BulkQueueItem[],
): { queue: BulkQueueItem[]; added: BulkQueueItem[]; unknownNames: string[] } {
  const names = parseBulkPasteNames(text);
  const added: BulkQueueItem[] = [];
  const unknownNames: string[] = [];
  let queue = existingQueue;

  for (const name of names) {
    const item = findItemByExactName(items, name);
    if (!item) {
      unknownNames.push(name);
      continue;
    }
    const beforeLen = queue.length;
    const result = addBulkQueueItem(queue, item);
    queue = result.queue;
    if (queue.length > beforeLen) {
      added.push(toBulkQueueItem(item));
    }
  }

  return { queue, added, unknownNames };
}

function parsePositiveQty(qty: string): number | null {
  const trimmed = qty.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export function computeBulkPreview(line: BulkQueueItem, type: BulkQuickType): BulkPreview {
  const before = Number(line.currentStock) || 0;
  const qty = parsePositiveQty(line.qty);

  if (qty === null) {
    return { itemId: line.itemId, before, after: before, error: 'กรุณาระบุจำนวนที่ถูกต้อง' };
  }

  if (type === 'IN') {
    return { itemId: line.itemId, before, after: before + qty };
  }

  const after = before - qty;
  if (after < 0) {
    return {
      itemId: line.itemId,
      before,
      after: before,
      error: 'จำนวนคงเหลือไม่พอ',
    };
  }

  return { itemId: line.itemId, before, after };
}

export function canSubmitBulkQueue(queue: BulkQueueItem[], type: BulkQuickType): boolean {
  if (queue.length === 0) return false;
  return queue.every((line) => computeBulkPreview(line, type).error === undefined);
}

export function resolveBulkSubmitPayload(
  queue: BulkQueueItem[],
  type: BulkQuickType,
): { itemId: string; type: BulkQuickType; quantity: number }[] {
  return queue.map((line) => {
    const preview = computeBulkPreview(line, type);
    const qty = Number(line.qty.trim());
    return { itemId: line.itemId, type, quantity: qty };
  }).filter((_, index) => computeBulkPreview(queue[index]!, type).error === undefined);
}
