import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { InventoryNotification } from '@/lib/notification-types';

export type BeanOrderDeliveredDestination = {
  subdistrict: string | null;
  district: string | null;
  province: string | null;
};

/** Client inbox copy. Does not load the postal-code database. */
function formatDeliveredLocality(destination?: BeanOrderDeliveredDestination | null): string {
  const labels: string[] = [];
  if (destination?.subdistrict) labels.push(`ต.${destination.subdistrict}`);
  if (destination?.district) labels.push(`อ.${destination.district}`);
  if (destination?.province) labels.push(`จ.${destination.province}`);
  return labels.join(' ');
}

function formatDeliveredSummary(
  customerName: string | null | undefined,
  destination?: BeanOrderDeliveredDestination | null,
  locale = 'th',
): string {
  const customer = customerName?.trim() || (locale === 'th' ? 'ลูกค้า' : 'Customer');
  const locality = formatDeliveredLocality(destination);
  return locality ? `${customer} ${locality}` : customer;
}

function destinationFromNotificationMetadata(
  meta: Record<string, unknown>,
): BeanOrderDeliveredDestination | null {
  const subdistrict =
    typeof meta.destinationSubdistrict === 'string' ? meta.destinationSubdistrict : null;
  const district = typeof meta.destinationDistrict === 'string' ? meta.destinationDistrict : null;
  const province = typeof meta.destinationProvince === 'string' ? meta.destinationProvince : null;
  if (!subdistrict && !district && !province) return null;
  return { subdistrict, district, province };
}

export function isEligibleBeanOrderDeliveredNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'bean_orders' || row.status !== 'success') return false;
  if (row.entity_type !== 'bean_order_delivery') return false;
  return row.metadata?.kind === 'bean_order_delivered';
}

function deliveredLogId(orderId: string): string {
  return `bb-bean-delivered-${orderId}`;
}

export function isTrackingDeliveredStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase().replace(/[_\s-]+/g, '');
  return normalized.includes('delivered');
}

export function formatBeanOrderDeliveredNotification(
  row: DataChangeLogRow,
  locale: string,
): InventoryNotification {
  const meta = row.metadata ?? {};
  const isTh = locale === 'th';
  const logId =
    typeof meta.notificationLogId === 'string'
      ? meta.notificationLogId
      : deliveredLogId(row.entity_id ?? row.id);

  const title =
    typeof meta.title === 'string' ? meta.title : isTh ? 'จัดส่งสำเร็จ' : 'Delivered';
  const customerName = typeof meta.customerName === 'string' ? meta.customerName : null;
  const destination = destinationFromNotificationMetadata(meta);
  const storedSummary = typeof meta.summary === 'string' ? meta.summary.trim() : '';
  const summary =
    storedSummary ||
    (customerName || destination
      ? formatDeliveredSummary(customerName, destination, locale)
      : '');
  const fieldSummary =
    typeof meta.fieldSummary === 'string' && !customerName && !destination
      ? meta.fieldSummary
      : summary;

  return {
    id: logId,
    logId,
    action: 'UPDATE',
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    actorLabel: row.actor_label,
    occurredAt: row.occurred_at,
    title,
    summary,
    fieldSummary,
    priority: 'high',
    read: false,
    batchedCount: 1,
    metadata: {
      ...meta,
      kind: 'bean_order_delivered',
      module: 'bean_orders',
      url:
        typeof meta.url === 'string'
          ? meta.url
          : `/${locale}/bean-orders/${row.entity_id ?? ''}`,
    },
  };
}
