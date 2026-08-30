/** Bulk IN/OUT queue for inventory quick action search/add lines; qty per row. */

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

export type BulkQuickType = 'IN' | 'OUT' | 'ADJUST';

export function getBulkSubmitTypeLabel(type: BulkQuickType): string {
  if (type === 'IN') return 'รับเข้า';
  if (type === 'OUT') return 'นำออก';
  return 'ปรับจำนวน';
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

/** Empty qty means 1 for IN/OUT; rejects 0, negative, and non-numeric values. */
export function resolveInOutQuantity(qty: string): number | null {
  const trimmed = qty.trim();
  if (trimmed === '') return 1;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

/** ADJUST requires explicit new stock level (0 allowed). */
export function resolveAdjustQuantity(qty: string): number | null {
  const trimmed = qty.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

export function resolveBulkLineQuantity(qty: string, type: BulkQuickType): number | null {
  return type === 'ADJUST' ? resolveAdjustQuantity(qty) : resolveInOutQuantity(qty);
}

/** Client-side optimistic stock after a quick IN/OUT/ADJUST save. */
export function computeOptimisticStockAfterTransaction(
  currentStock: number,
  type: 'IN' | 'OUT' | 'ADJUST',
  quantity: number,
): number | null {
  if (type === 'ADJUST') {
    return Number.isFinite(quantity) && quantity >= 0 ? quantity : null;
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const before = Number(currentStock) || 0;
  if (type === 'IN') return before + qty;
  if (before < qty) return null;
  return before - qty;
}

/** Display qty on bulk confirm dialog empty IN/OUT defaults show as "1". */
export function formatBulkConfirmQty(qty: string, type: BulkQuickType = 'IN'): string {
  if (type === 'ADJUST') {
    const resolved = resolveAdjustQuantity(qty);
    return resolved !== null ? String(resolved) : qty.trim();
  }
  const resolved = resolveInOutQuantity(qty);
  if (resolved !== null) return String(resolved);
  return qty.trim();
}

export function computeBulkPreview(line: BulkQueueItem, type: BulkQuickType): BulkPreview {
  const before = Number(line.currentStock) || 0;

  if (type === 'ADJUST') {
    const newStock = resolveAdjustQuantity(line.qty);
    if (newStock === null) {
      return {
        itemId: line.itemId,
        before,
        after: before,
        error: line.qty.trim() === '' ? 'กรุณาระบุจำนวนคงเหลือใหม่' : 'กรุณาระบุจำนวนที่ถูกต้อง',
      };
    }
    return { itemId: line.itemId, before, after: newStock };
  }

  const qty = resolveInOutQuantity(line.qty);

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
      quantity: resolveBulkLineQuantity(line.qty, type)!,
    }));
}
