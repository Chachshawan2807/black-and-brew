import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import type { InventoryNotification } from '@/lib/notification-types';
import { parseThaiPostalAddressLine } from '@/lib/bean-orders/address';
import { formatThaiAdminAreaLabel } from '@/lib/bean-orders/thai-postal-lookup';

export type BeanOrderDeliveredDestination = {
  subdistrict: string | null;
  district: string | null;
  province: string | null;
};

export type BeanOrderDeliveredNotifyInput = {
  orderId: string;
  orderNo: string;
  customerName: string | null;
  destination?: BeanOrderDeliveredDestination | null;
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

export function destinationFromBeanOrderRecipient(input: {
  recipientAddress: string;
  recipientProvince?: string | null;
  recipientPostalCode?: string | null;
  recipientName?: string;
}): BeanOrderDeliveredDestination {
  const parsed = parseThaiPostalAddressLine(input.recipientAddress, {
    province: input.recipientProvince,
    postalCode: input.recipientPostalCode,
    name: input.recipientName ?? '',
  });

  return {
    subdistrict: parsed.subdistrict.trim() || null,
    district: parsed.district.trim() || null,
    province: parsed.province.trim() || input.recipientProvince?.trim() || null,
  };
}

export function formatBeanOrderDeliveredSummary(
  customerName: string | null | undefined,
  destination?: BeanOrderDeliveredDestination | null,
  locale = 'th',
): string {
  const customer = customerName?.trim() || (locale === 'th' ? 'ลูกค้า' : 'Customer');
  const locality = formatThaiAdminAreaLabel({
    subdistrict: destination?.subdistrict,
    district: destination?.district,
    province: destination?.province,
  });
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

export function buildBeanOrderDeliveredCopy(
  input: BeanOrderDeliveredNotifyInput,
  locale = 'th',
): { title: string; summary: string; fieldSummary: string } {
  const isTh = locale === 'th';
  const title = isTh ? 'จัดส่งสำเร็จ' : 'Delivered';
  const summary = formatBeanOrderDeliveredSummary(input.customerName, input.destination, locale);

  return { title, summary, fieldSummary: summary };
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
        destinationSubdistrict: input.destination?.subdistrict ?? null,
        destinationDistrict: input.destination?.district ?? null,
        destinationProvince: input.destination?.province ?? null,
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
  const customerName = typeof meta.customerName === 'string' ? meta.customerName : null;
  const destination = destinationFromNotificationMetadata(meta);
  const summary =
    customerName || destination
      ? formatBeanOrderDeliveredSummary(customerName, destination, locale)
      : typeof meta.summary === 'string'
        ? meta.summary
        : '';
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
