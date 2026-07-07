import type { InventoryNotification } from '@/lib/notification-types';
import { INVENTORY_QUICK_ACTION_COLORS, PASTEL_SURFACE } from '@/lib/shift-colors';

export type StockOperation = 'IN' | 'OUT' | 'ADJUST';

export type NotificationDisplayIconKind =
  | 'schedule'
  | 'stock-in'
  | 'stock-out'
  | 'stock-adjust'
  | 'create'
  | 'delete'
  | 'bulk-update'
  | 'update';

const SCHEDULE_SURFACE = `${PASTEL_SURFACE} bg-[#e6f0ff] text-black border border-[#c2d6ff]`;

const STOCK_SURFACES: Record<StockOperation, string> = {
  IN: `${INVENTORY_QUICK_ACTION_COLORS.in} text-black`,
  OUT: `${INVENTORY_QUICK_ACTION_COLORS.out} text-black`,
  ADJUST: `${INVENTORY_QUICK_ACTION_COLORS.adjust} text-black`,
};

export function detectStockOperationFromMetadata(
  metadata: Record<string, unknown>,
  module?: string | null,
): StockOperation | null {
  if (module && module !== 'inventory') return null;

  const operation = metadata.operation;
  if (operation === 'record_transaction') {
    const type = metadata.type;
    if (type === 'IN') return 'IN';
    if (type === 'OUT') return 'OUT';
  }
  if (operation === 'set_stock') return 'ADJUST';
  return null;
}

export function isScheduleNotification(item: InventoryNotification): boolean {
  const meta = item.metadata ?? {};
  if (meta.kind === 'daily_report') return true;
  if (meta.module === 'schedule') return true;

  const url = meta.url;
  if (typeof url === 'string' && url.includes('/schedule')) return true;

  if (/^ตารางงาน/u.test(item.title)) return true;
  if (/^(Today's|Tomorrow's) schedule/u.test(item.title)) return true;

  return false;
}

function detectStockOperationFromTitle(title: string): StockOperation | null {
  if (/^รับเข้/u.test(title) || /^Stock in/u.test(title)) return 'IN';
  if (/^นำออก/u.test(title) || /^Stock out/u.test(title)) return 'OUT';
  if (/^ปรับจำนวน/u.test(title) || /^Stock adjusted/u.test(title)) return 'ADJUST';
  return null;
}

export function resolveNotificationDisplayIcon(item: InventoryNotification): {
  kind: NotificationDisplayIconKind;
  containerClass: string;
} {
  if (isScheduleNotification(item)) {
    return { kind: 'schedule', containerClass: SCHEDULE_SURFACE };
  }

  const stockFromMeta = detectStockOperationFromMetadata(item.metadata ?? {});
  const stockFromTitle = detectStockOperationFromTitle(item.title);
  const stockOp = stockFromMeta ?? stockFromTitle;

  if (stockOp === 'IN') {
    return { kind: 'stock-in', containerClass: STOCK_SURFACES.IN };
  }
  if (stockOp === 'OUT') {
    return { kind: 'stock-out', containerClass: STOCK_SURFACES.OUT };
  }
  if (stockOp === 'ADJUST') {
    return { kind: 'stock-adjust', containerClass: STOCK_SURFACES.ADJUST };
  }

  switch (item.action) {
    case 'CREATE':
      return { kind: 'create', containerClass: 'bg-muted text-foreground/70' };
    case 'DELETE':
    case 'BULK_DELETE':
      return { kind: 'delete', containerClass: 'bg-muted text-foreground/70' };
    case 'BULK_UPDATE':
      return { kind: 'bulk-update', containerClass: 'bg-muted text-foreground/70' };
    default:
      return { kind: 'update', containerClass: 'bg-muted text-foreground/70' };
  }
}
