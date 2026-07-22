import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import type { InventoryNotification } from '@/lib/notification-types';
import { mapTrackingStatusLabel } from '@/lib/bean-orders/trackingmore';

export type BeanOrderDeliveredNotifyInput = {
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

export function isTrackingDeliveredStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase().replace(/[_\s-]+/g, '');
  return normalized.includes('delivered');
}

/** Fire only on first transition into delivered. */
export function shouldNotifyBeanOrderDelivered(
  previousStatus: string | null | undefined,
  nextStatus: string | null | undefined,
): boolean {
  return isTrackingDeliveredStatus(nextStatus) && !isTrackingDeliveredStatus(previousStatus);
}

export function beanOrderDeliveredNotificationLogId(orderId: string): string {
  return `bb-bean-delivered-${orderId}`;
}

export function buildBeanOrderDeliveredCopy(
  input: BeanOrderDeliveredNotifyInput,
  locale = 'th',
): { title: string; summary: string; fieldSummary: string } {
  const isTh = locale === 'th';
  const title = isTh ? 'จัดส่งสำเร็จ' : 'Delivered';
  const customer = input.customerName?.trim() || (isTh ? 'ลูกค้า' : 'Customer');
  const tracking = input.trackingNumber?.trim();
  const summary = `${input.orderNo} / ${customer}`;
  const fieldSummary = tracking
    ? isTh
      ? `พัสดุ ${tracking} ${mapTrackingStatusLabel('delivered')}`
      : `Parcel ${tracking} delivered`
    : isTh
      ? `${input.orderNo} จัดส่งสำเร็จ`
      : `${input.orderNo} delivered`;

  return { title, summary, fieldSummary };
}

/** Persist delivered event so FAB / mobile panel catch it via data_change_logs realtime. */
export async function recordBeanOrderDeliveredNotification(
  input: BeanOrderDeliveredNotifyInput,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: 'missing_supabase' };

  const locale = input.locale ?? 'th';
  const logId = beanOrderDeliveredNotificationLogId(input.orderId);
  const { title, summary, fieldSummary } = buildBeanOrderDeliveredCopy(input, locale);
  const url = `/${locale}/bean-orders/${input.orderId}`;
  const isTh = locale === 'th';

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('data_change_logs')
      .select('id, metadata')
      .eq('module', 'bean_orders')
      .eq('entity_type', 'bean_order_delivery')
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
        (row) => (row.metadata as Record<string, unknown> | null)?.kind === 'bean_order_delivered',
      )
    ) {
      return { success: true, skipped: true };
    }

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: new Date().toISOString(),
      actor_id: null,
      actor_label: isTh ? 'ระบบติดตามพัสดุ' : 'Tracking system',
      actor_access_level: 'system',
      action: 'UPDATE',
      module: 'bean_orders',
      entity_type: 'bean_order_delivery',
      entity_id: input.orderId,
      entity_label: input.orderNo,
      field_changes: [],
      old_value: null,
      new_value: sanitizeJsonValue({
        trackingNumber: input.trackingNumber,
        carrierCode: input.carrierCode ?? null,
        trackingStatus: 'delivered',
      }),
      source: 'system',
      status: 'success',
      metadata: {
        kind: 'bean_order_delivered',
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
    console.error('[recordBeanOrderDeliveredNotification]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'record_failed',
    };
  }
}

export function isEligibleBeanOrderDeliveredNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'bean_orders' || row.status !== 'success') return false;
  if (row.entity_type !== 'bean_order_delivery') return false;
  return row.metadata?.kind === 'bean_order_delivered';
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
      : beanOrderDeliveredNotificationLogId(row.entity_id ?? row.id);

  const title =
    typeof meta.title === 'string' ? meta.title : isTh ? 'จัดส่งสำเร็จ' : 'Delivered';
  const fieldSummary =
    typeof meta.fieldSummary === 'string'
      ? meta.fieldSummary
      : typeof meta.summary === 'string'
        ? meta.summary
        : '';
  const summary =
    typeof meta.summary === 'string'
      ? meta.summary
      : fieldSummary.split('\n').filter(Boolean)[0] ?? '';

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
