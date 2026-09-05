import type { InventoryNotification } from '@/lib/notification-types';
import { BB_ICON_BADGE_FILL } from '@/lib/ui-outlined-tokens';

export type StockOperation = 'IN' | 'OUT' | 'ADJUST';

/** Unicode prefixes for stock ops mirrors quick-action / notification panel icons. */
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

/** Stock quick-action OS titles: "+ Item", "− Item", "⇄ Item", or batched "+ N รายการ". */
export function isStockOperationNotificationTitle(title: string): boolean {
  return /^[+−⇄]\s/u.test(title.trim());
}

export type NotificationDisplayIconKind =
  | 'schedule'
  | 'insight'
  | 'security'
  | 'bean-created'
  | 'bean-delivered'
  | 'bean-paid'
  | 'stock-in'
  | 'stock-out'
  | 'stock-adjust'
  | 'create'
  | 'delete'
  | 'bulk-update'
  | 'update';

const SCHEDULE_SURFACE = BB_ICON_BADGE_FILL.schedule;
/** Deeper orange pastel than 8:00 / stock-adjust (#fff3cd) for at-a-glance distinction. */
const INSIGHT_SURFACE = BB_ICON_BADGE_FILL.insight;
const SECURITY_SURFACE = BB_ICON_BADGE_FILL.security;
const BEAN_CREATED_SURFACE = BB_ICON_BADGE_FILL.order;
const BEAN_DELIVERED_SURFACE = BB_ICON_BADGE_FILL.stockIn;
const BEAN_PAYMENT_SURFACE = BB_ICON_BADGE_FILL.stockIn;

const STOCK_SURFACES: Record<StockOperation, string> = {
  IN: BB_ICON_BADGE_FILL.stockIn,
  OUT: BB_ICON_BADGE_FILL.stockOut,
  ADJUST: BB_ICON_BADGE_FILL.stockAdjust,
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

export function isBeanOrderCreatedNotification(item: InventoryNotification): boolean {
  const meta = item.metadata ?? {};
  return meta.kind === 'bean_order_created';
}

export function isBeanOrderPaymentNotification(item: InventoryNotification): boolean {
  const meta = item.metadata ?? {};
  if (meta.kind === 'bean_order_payment_confirmed') return true;
  return /^ชำระแล้ว/u.test(item.title) || /^Paid/u.test(item.title);
}

export function isBeanOrderDeliveredNotification(item: InventoryNotification): boolean {
  if (isBeanOrderPaymentNotification(item)) return false;

  const meta = item.metadata ?? {};
  if (meta.kind === 'bean_order_delivered' || meta.kind === 'bean_order_shipped') return true;
  if (meta.module === 'bean_orders' && typeof meta.url === 'string' && meta.url.includes('/bean-orders/')) {
    return (
      /^จัดส่งสำเร็จ/u.test(item.title) ||
      /^Delivered/u.test(item.title) ||
      /^ส่งแล้ว/u.test(item.title) ||
      /^Shipped/u.test(item.title)
    );
  }
  return (
    /^จัดส่งสำเร็จ/u.test(item.title) ||
    /^Delivered/u.test(item.title) ||
    /^ส่งแล้ว/u.test(item.title) ||
    /^Shipped/u.test(item.title)
  );
}

export function isProactiveInsightNotification(item: InventoryNotification): boolean {
  const meta = item.metadata ?? {};
  if (meta.kind === 'proactive_insight') return true;
  if (meta.module === 'insights') return true;
  return false;
}

export function isSecurityNotification(item: InventoryNotification): boolean {
  const meta = item.metadata ?? {};
  if (meta.kind === 'pin_lockout') return true;
  if (meta.module === 'security') return true;
  return false;
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

  if (isProactiveInsightNotification(item)) {
    return { kind: 'insight', containerClass: INSIGHT_SURFACE };
  }

  if (isSecurityNotification(item)) {
    return { kind: 'security', containerClass: SECURITY_SURFACE };
  }

  if (isBeanOrderCreatedNotification(item)) {
    return { kind: 'bean-created', containerClass: BEAN_CREATED_SURFACE };
  }

  if (isBeanOrderPaymentNotification(item)) {
    return { kind: 'bean-paid', containerClass: BEAN_PAYMENT_SURFACE };
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
      return { kind: 'create', containerClass: 'bg-muted' };
    case 'DELETE':
    case 'BULK_DELETE':
      return { kind: 'delete', containerClass: 'bg-muted' };
    case 'BULK_UPDATE':
      return { kind: 'bulk-update', containerClass: 'bg-muted' };
    default:
      return { kind: 'update', containerClass: 'bg-muted' };
  }
}
