import type { InventoryNotification } from '@/lib/notification-types';
import { INVENTORY_QUICK_ACTION_COLORS, PASTEL_SURFACE } from '@/lib/shift-colors';

export type StockOperation = 'IN' | 'OUT' | 'ADJUST';

/** Unicode prefixes for stock ops — mirrors quick-action / notification panel icons. */
export const STOCK_OPERATION_SYMBOL: Record<StockOperation, string> = {
  IN: '+',
  OUT: '−',
  ADJUST: '⇄',
};

export function formatStockOperationTitle(operation: StockOperation, entityName: string): string {
  return `${STOCK_OPERATION_SYMBOL[operation]} ${entityName}`;
}

export function formatStockOperationBatchedTitle(
  operation: StockOperation,
  count: number,
  isTh: boolean,
): string {
  const symbol = STOCK_OPERATION_SYMBOL[operation];
  return isTh ? `${symbol} ${count} รายการ` : `${symbol} ${count} items`;
}

export type NotificationDisplayIconKind =
  | 'schedule'
  | 'bean-delivered'
  | 'stock-in'
  | 'stock-out'
  | 'stock-adjust'
  | 'create'
  | 'delete'
  | 'bulk-update'
  | 'update';

const SCHEDULE_SURFACE = `${PASTEL_SURFACE} bg-[#e6f0ff] text-black border border-[#c2d6ff]`;
const BEAN_DELIVERED_SURFACE = `${PASTEL_SURFACE} bg-[#e8f5e9] text-black border border-[#c8e6c9]`;

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

export function isBeanOrderDeliveredNotification(item: InventoryNotification): boolean {
  const meta = item.metadata ?? {};
  if (meta.kind === 'bean_order_delivered') return true;
  if (meta.module === 'bean_orders' && typeof meta.url === 'string' && meta.url.includes('/bean-orders/')) {
    return true;
  }
  return /^จัดส่งสำเร็จ/u.test(item.title) || /^Delivered/u.test(item.title);
}

function detectStockOperationFromTitle(title: string): StockOperation | null {
  if (/^\+[\s:]/u.test(title)) return 'IN';
  if (/^−[\s:]/u.test(title)) return 'OUT';
  if (/^⇄[\s:]/u.test(title)) return 'ADJUST';
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

  if (isBeanOrderDeliveredNotification(item)) {
    return { kind: 'bean-delivered', containerClass: BEAN_DELIVERED_SURFACE };
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
