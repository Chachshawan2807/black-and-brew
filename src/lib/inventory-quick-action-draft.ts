import type { BulkQueueItem, BulkStockItem } from '@/lib/inventory-quick-bulk';

export const INVENTORY_QUICK_ACTION_DRAFT_KEY = 'bb-inventory-quick-action-draft';

export type QuickActionDraftType = 'IN' | 'OUT' | 'ADJUST';

export type InventoryQuickActionDraft = {
  bulkMode: boolean;
  bulkQueue: BulkQueueItem[];
  quickSearch: string;
  quickQty: string;
  quickType: QuickActionDraftType;
};

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBulkQueueItem(value: unknown): value is BulkQueueItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.itemId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.unit === 'string' &&
    typeof value.currentStock === 'number' &&
    typeof value.qty === 'string'
  );
}

function isQuickType(value: unknown): value is QuickActionDraftType {
  return value === 'IN' || value === 'OUT' || value === 'ADJUST';
}

export function serializeInventoryQuickActionDraft(draft: InventoryQuickActionDraft): string {
  return JSON.stringify(draft);
}

export function parseInventoryQuickActionDraft(raw: string): InventoryQuickActionDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.bulkMode !== 'boolean') return null;
    if (!Array.isArray(parsed.bulkQueue) || !parsed.bulkQueue.every(isBulkQueueItem)) return null;
    if (typeof parsed.quickSearch !== 'string') return null;
    if (typeof parsed.quickQty !== 'string') return null;
    if (!isQuickType(parsed.quickType)) return null;

    return {
      bulkMode: parsed.bulkMode,
      bulkQueue: parsed.bulkQueue,
      quickSearch: parsed.quickSearch,
      quickQty: parsed.quickQty,
      quickType: parsed.quickType,
    };
  } catch {
    return null;
  }
}

export function hydrateBulkQueueFromItems(
  queue: BulkQueueItem[],
  items: BulkStockItem[],
): BulkQueueItem[] {
  return queue
    .map((line) => {
      const item = items.find((row) => row.id === line.itemId);
      if (!item) return null;
      return {
        ...line,
        name: item.name,
        unit: item.unit,
        currentStock: Number(item.stock) || 0,
      };
    })
    .filter((line): line is BulkQueueItem => line !== null);
}

export function hasInventoryQuickActionDraft(draft: InventoryQuickActionDraft): boolean {
  return (
    draft.bulkQueue.length > 0 ||
    draft.quickSearch.trim().length > 0 ||
    draft.quickQty.trim().length > 0
  );
}

export function getDefaultInventoryQuickActionDraft(): InventoryQuickActionDraft {
  return {
    bulkMode: false,
    bulkQueue: [],
    quickSearch: '',
    quickQty: '',
    quickType: 'IN',
  };
}

export function loadInventoryQuickActionDraft(
  storage: DraftStorage = typeof localStorage !== 'undefined' ? localStorage : undefined!,
): InventoryQuickActionDraft | null {
  if (!storage) return null;
  const raw = storage.getItem(INVENTORY_QUICK_ACTION_DRAFT_KEY);
  if (!raw) return null;
  return parseInventoryQuickActionDraft(raw);
}

export function saveInventoryQuickActionDraft(
  draft: InventoryQuickActionDraft,
  storage: DraftStorage = typeof localStorage !== 'undefined' ? localStorage : undefined!,
): void {
  if (!storage) return;
  if (!hasInventoryQuickActionDraft(draft)) {
    storage.removeItem(INVENTORY_QUICK_ACTION_DRAFT_KEY);
    return;
  }
  storage.setItem(INVENTORY_QUICK_ACTION_DRAFT_KEY, serializeInventoryQuickActionDraft(draft));
}

export function clearInventoryQuickActionDraft(
  storage: DraftStorage = typeof localStorage !== 'undefined' ? localStorage : undefined!,
): void {
  if (!storage) return;
  storage.removeItem(INVENTORY_QUICK_ACTION_DRAFT_KEY);
}
