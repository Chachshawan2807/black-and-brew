import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import type { InventoryNotification } from '@/lib/notification-types';

export type BeanOrderShippedNotifyInput = {
  orderId: string;
  orderNo: string;
  customerName: string | null;
  trackingNumber: string | null;
  carrierCode?: string | null;
  locale?: string;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

/** Fire only on first transition into shipped. */
export function shouldNotifyBeanOrderShipped(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): boolean {
  const prev = (previousStatus ?? '').trim().toLowerCase();
  const next = (nextStatus ?? '').trim().toLowerCase();
  return next === 'shipped' && prev !== 'shipped';
}

export function beanOrderShippedNotificationLogId(orderId: string): string {
  return `bb-bean-shipped-${orderId}`;
}

export function formatBeanOrderShippedSummary(
  customerName: string | null | undefined,
  trackingNumber: string | null | undefined,
  locale = 'th',
): string {
  const customer = customerName?.trim() || (locale === 'th' ? 'ลูกค้า' : 'Customer');
  const tracking = trackingNumber?.trim();
  return tracking ? `${customer} · ${tracking}` : customer;
}

export function buildBeanOrderShippedCopy(
  input: BeanOrderShippedNotifyInput,
  locale = 'th',
): { title: string; summary: string; fieldSummary: string } {
  const isTh = locale === 'th';
  const title = isTh ? 'ส่งแล้ว' : 'Shipped';
  const summary = formatBeanOrderShippedSummary(input.customerName, input.trackingNumber, locale);
  return { title, summary, fieldSummary: summary };
}

/** Persist shipped event so FAB / mobile panel catch it via data_change_logs realtime. */
export async function recordBeanOrderShippedNotification(
  input: BeanOrderShippedNotifyInput,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: 'missing_supabase' };

  const locale = input.locale ?? 'th';
  const logId = beanOrderShippedNotificationLogId(input.orderId);
  const { title, summary, fieldSummary } = buildBeanOrderShippedCopy(input, locale);
  const url = `/${locale}/bean-orders/${input.orderId}`;
  const isTh = locale === 'th';

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('data_change_logs')
      .select('id, metadata')
      .eq('module', 'bean_orders')
      .eq('entity_type', 'bean_order_shipment')
      .eq('entity_id', input.orderId)
      .limit(10);

    if (lookupError) {
      if (lookupError.code === 'PGRST205' || lookupError.message?.includes('Could not find the table')) {
        return { success: false, error: lookupError.message };
      }
      console.error('Supabase Error:', lookupError.message, lookupError.details);
      throw lookupError;
    }

    if (
      (existing ?? []).some(
        (row) => (row.metadata as Record<string, unknown> | null)?.kind === 'bean_order_shipped',
      )
    ) {
      return { success: true, skipped: true };
    }

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: new Date().toISOString(),
      actor_id: null,
      actor_label: isTh ? 'ระบบจัดส่ง' : 'Shipping system',
      actor_access_level: 'system',
      action: 'UPDATE',
      module: 'bean_orders',
      entity_type: 'bean_order_shipment',
      entity_id: input.orderId,
      entity_label: input.orderNo,
      field_changes: [
        { field: 'fulfillment_status', old_value: 'pending', new_value: 'shipped' },
      ],
      old_value: null,
      new_value: sanitizeJsonValue({
        trackingNumber: input.trackingNumber,
        carrierCode: input.carrierCode ?? null,
        fulfillmentStatus: 'shipped',
      }),
      source: 'system',
      status: 'success',
      metadata: {
        kind: 'bean_order_shipped',
        notificationLogId: logId,
        title,
        summary,
        fieldSummary,
        url,
        locale,
        trackingNumber: input.trackingNumber,
        orderNo: input.orderNo,
        customerName: input.customerName,
        carrierCode: input.carrierCode ?? null,
      },
    });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return { success: false, error: error.message };
      }
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('[recordBeanOrderShippedNotification]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'record_failed',
    };
  }
}

export function isEligibleBeanOrderShippedNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'bean_orders' || row.status !== 'success') return false;
  if (row.entity_type !== 'bean_order_shipment') return false;
  return row.metadata?.kind === 'bean_order_shipped';
}

export function formatBeanOrderShippedNotification(
  row: DataChangeLogRow,
  locale: string,
): InventoryNotification {
  const meta = row.metadata ?? {};
  const isTh = locale === 'th';
  const logId =
    typeof meta.notificationLogId === 'string'
      ? meta.notificationLogId
      : beanOrderShippedNotificationLogId(row.entity_id ?? row.id);

  const title = typeof meta.title === 'string' ? meta.title : isTh ? 'ส่งแล้ว' : 'Shipped';
  const customerName = typeof meta.customerName === 'string' ? meta.customerName : null;
  const trackingNumber =
    typeof meta.trackingNumber === 'string'
      ? meta.trackingNumber
      : typeof meta.tracking_number === 'string'
        ? meta.tracking_number
        : null;
  const summary =
    customerName || trackingNumber
      ? formatBeanOrderShippedSummary(customerName, trackingNumber, locale)
      : typeof meta.summary === 'string'
        ? meta.summary
        : '';
  const fieldSummary =
    typeof meta.fieldSummary === 'string' && !customerName && !trackingNumber
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
      kind: 'bean_order_shipped',
      module: 'bean_orders',
      url:
        typeof meta.url === 'string'
          ? meta.url
          : `/${locale}/bean-orders/${row.entity_id ?? ''}`,
    },
  };
}
