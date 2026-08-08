import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import type { InventoryNotification } from '@/lib/notification-types';

export type BeanOrderPaymentNotifyInput = {
  orderId: string;
  orderNo: string;
  customerName: string | null;
  totalBaht?: number | null;
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

export function beanOrderPaymentNotificationLogId(orderId: string): string {
  return `bb-bean-paid-${orderId}`;
}

export function formatBeanOrderPaymentSummary(
  customerName: string | null | undefined,
  totalBaht: number | null | undefined,
  locale = 'th',
): string {
  const customer = customerName?.trim() || (locale === 'th' ? 'ลูกค้า' : 'Customer');
  if (totalBaht == null || !Number.isFinite(totalBaht)) return customer;
  const formatted = totalBaht.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${customer} · ${formatted} บาท`;
}

export function buildBeanOrderPaymentCopy(
  input: BeanOrderPaymentNotifyInput,
  locale = 'th',
): { title: string; summary: string; fieldSummary: string } {
  const isTh = locale === 'th';
  const title = isTh ? 'ชำระแล้ว' : 'Paid';
  const summary = formatBeanOrderPaymentSummary(input.customerName, input.totalBaht, locale);
  return { title, summary, fieldSummary: summary };
}

/** Persist payment-confirmed event so FAB / mobile panel catch it via data_change_logs realtime. */
export async function recordBeanOrderPaymentNotification(
  input: BeanOrderPaymentNotifyInput,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: 'missing_supabase' };

  const locale = input.locale ?? 'th';
  const logId = beanOrderPaymentNotificationLogId(input.orderId);
  const { title, summary, fieldSummary } = buildBeanOrderPaymentCopy(input, locale);
  const url = `/${locale}/bean-orders/${input.orderId}`;
  const isTh = locale === 'th';

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('data_change_logs')
      .select('id, metadata')
      .eq('module', 'bean_orders')
      .eq('entity_type', 'bean_order_payment')
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
        (row) =>
          (row.metadata as Record<string, unknown> | null)?.kind === 'bean_order_payment_confirmed',
      )
    ) {
      return { success: true, skipped: true };
    }

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: new Date().toISOString(),
      actor_id: null,
      actor_label: isTh ? 'ระบบชำระเงิน' : 'Payment system',
      actor_access_level: 'system',
      action: 'UPDATE',
      module: 'bean_orders',
      entity_type: 'bean_order_payment',
      entity_id: input.orderId,
      entity_label: input.orderNo,
      field_changes: [{ field: 'payment_status', old_value: 'unpaid', new_value: 'paid' }],
      old_value: null,
      new_value: sanitizeJsonValue({
        paymentStatus: 'paid',
        totalBaht: input.totalBaht ?? null,
      }),
      source: 'system',
      status: 'success',
      metadata: {
        kind: 'bean_order_payment_confirmed',
        notificationLogId: logId,
        title,
        summary,
        fieldSummary,
        url,
        locale,
        orderNo: input.orderNo,
        customerName: input.customerName,
        totalBaht: input.totalBaht ?? null,
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
    console.error('[recordBeanOrderPaymentNotification]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'record_failed',
    };
  }
}

export function isEligibleBeanOrderPaymentNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'bean_orders' || row.status !== 'success') return false;
  if (row.entity_type !== 'bean_order_payment') return false;
  return row.metadata?.kind === 'bean_order_payment_confirmed';
}

export function formatBeanOrderPaymentNotification(
  row: DataChangeLogRow,
  locale: string,
): InventoryNotification {
  const meta = row.metadata ?? {};
  const isTh = locale === 'th';
  const logId =
    typeof meta.notificationLogId === 'string'
      ? meta.notificationLogId
      : beanOrderPaymentNotificationLogId(row.entity_id ?? row.id);

  const title = typeof meta.title === 'string' ? meta.title : isTh ? 'ชำระแล้ว' : 'Paid';
  const customerName = typeof meta.customerName === 'string' ? meta.customerName : null;
  const totalBaht =
    typeof meta.totalBaht === 'number'
      ? meta.totalBaht
      : typeof meta.totalBaht === 'string'
        ? Number(meta.totalBaht)
        : null;
  const summary =
    customerName || totalBaht != null
      ? formatBeanOrderPaymentSummary(customerName, totalBaht, locale)
      : typeof meta.summary === 'string'
        ? meta.summary
        : '';
  const fieldSummary =
    typeof meta.fieldSummary === 'string' && !customerName && totalBaht == null
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
      kind: 'bean_order_payment_confirmed',
      module: 'bean_orders',
      url:
        typeof meta.url === 'string'
          ? meta.url
          : `/${locale}/bean-orders/${row.entity_id ?? ''}`,
    },
  };
}
