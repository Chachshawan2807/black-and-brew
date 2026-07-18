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

export function getBulkSubmitTypeLabel(type: BulkQuickType): string {
  return type === 'IN' ? 'รับเข้า' : 'นำออก';
}

export function parseBulkEntry(line: string): { name: string; qty: string } {
  const cleanedLine = line.replace(/^\s*\d+\.\s*/, '').trim();
  const eqIndex = cleanedLine.indexOf('=');
  if (eqIndex !== -1) {
    const namePart = cleanedLine.substring(0, eqIndex).trim();
    const qtyPart = cleanedLine.substring(eqIndex + 1).trim();
    return { name: namePart, qty: qtyPart || '1' };
  }
  return { name: cleanedLine, qty: '1' };
}

export function parseBulkPasteNames(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((part) => parseBulkEntry(part).name.trim())
    .filter(Boolean);
}

export function findItemByFuzzyName<T extends BulkStockItem>(items: T[], name: string): T | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;

  const exact = items.find((item) => item.name.toLowerCase() === needle);
  if (exact) return exact;

  const needleTokens = needle.split(/\s+/).filter(Boolean);
  
  let bestMatch: T | undefined;
  let highestScore = -Infinity;

  for (const item of items) {
    const itemName = item.name.toLowerCase();
    let score = 0;

    if (itemName.includes(needle)) {
      score += 50;
    } else if (needle.includes(itemName)) {
      score += 30;
    }

    const itemTokens = itemName.split(/\s+/).filter(Boolean);
    let matchedTokens = 0;

    for (const nt of needleTokens) {
      for (const it of itemTokens) {
        if (it === nt) {
          matchedTokens += 2;
          break;
        } else if (it.includes(nt) || nt.includes(it)) {
          matchedTokens += 1;
          break;
        }
      }
    }

    if (matchedTokens > 0) {
      score += matchedTokens * 10;
      score -= Math.abs(itemName.length - needle.length) * 0.1;

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }
  }

  if (highestScore > 0) {
    return bestMatch;
  }

  return undefined;
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
  return { queue: [toBulkQueueItem(item), ...queue], duplicate: false };
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
  const rawLines = text.split(/[\n,]+/).map((part) => part.trim()).filter(Boolean);
  const added: BulkQueueItem[] = [];
  const unknownNames: string[] = [];
  let queue = existingQueue;

  for (const line of rawLines) {
    const { name, qty } = parseBulkEntry(line);
    const item = findItemByFuzzyName(items, name);
    
    if (!item) {
      unknownNames.push(name);
      continue;
    }
    
    const beforeLen = queue.length;
    const result = addBulkQueueItem(queue, item);
    queue = result.queue;
    
    queue = setBulkLineQty(queue, item.id, qty);
    
    if (queue.length > beforeLen) {
      added.push(queue[0]!);
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
  return queue
    .filter((line) => computeBulkPreview(line, type).error === undefined)
    .map((line) => ({
      itemId: line.itemId,
      type,
      quantity: Number(line.qty.trim()),
    }));
}
