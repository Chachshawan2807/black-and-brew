import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { getBeanOrderCustomerDisplayName } from '@/lib/bean-orders/customer-display';
import type { WeightUnit } from '@/lib/bean-orders/types';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import type { InventoryNotification } from '@/lib/notification-types';

export type BeanOrderCreatedLine = {
  itemName: string;
  weightValue: number;
  weightUnit: WeightUnit;
};

export type BeanOrderCreatedNotifyInput = {
  orderId: string;
  orderNo: string;
  customerName: string | null;
  recipientName: string;
  lines: BeanOrderCreatedLine[];
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

export function beanOrderCreatedNotificationLogId(orderId: string): string {
  return `bb-bean-created-${orderId}`;
}

export function formatBeanOrderLineWeight(
  value: number,
  unit: WeightUnit,
  locale = 'th',
): string {
  if (unit === 'kg') return locale === 'th' ? `${value} กก.` : `${value} kg`;
  return locale === 'th' ? `${value} ก.` : `${value} g`;
}

export function formatBeanOrderCreatedItemsSummary(
  lines: BeanOrderCreatedLine[],
  locale = 'th',
): string {
  const parts = lines
    .filter((line) => line.itemName.trim())
    .map(
      (line) =>
        `${line.itemName.trim()} ${formatBeanOrderLineWeight(line.weightValue, line.weightUnit, locale)}`,
    );

  if (parts.length === 0) {
    return locale === 'th' ? 'ไม่มีรายการเมล็ด' : 'No bean lines';
  }

  return parts.join(' · ');
}

export function resolveBeanOrderCreatedCustomerName(
  input: Pick<BeanOrderCreatedNotifyInput, 'customerName' | 'recipientName'>,
): string {
  return getBeanOrderCustomerDisplayName({
    customerName: input.customerName,
    recipientName: input.recipientName,
  });
}

export function getBeanOrderCreatedHeadline(locale = 'th'): string {
  return locale === 'th' ? 'ออเดอร์เมล็ดกาแฟใหม่' : 'New coffee bean order';
}

export const BEAN_ORDER_CREATED_OS_TITLE_MAX = 120;
export const BEAN_ORDER_CREATED_OS_BODY_MAX = 240;

/** OS tray: headline + customer on title (iOS) or in body (Android), items always in body. */
export function buildBeanOrderCreatedOsNotification(
  headline: string,
  customerLine: string,
  itemsSummary: string,
  isIos = false,
): { title: string; body: string } {
  const head = headline.trim().slice(0, BEAN_ORDER_CREATED_OS_TITLE_MAX);
  const customer = customerLine.trim();
  const items = itemsSummary.trim().slice(0, BEAN_ORDER_CREATED_OS_BODY_MAX);

  if (isIos) {
    const titleMerged = customer
      ? `${head}\n${customer}`.slice(0, BEAN_ORDER_CREATED_OS_TITLE_MAX)
      : head;
    return { title: titleMerged, body: items };
  }

  const bodyParts: string[] = [];
  if (customer) bodyParts.push(customer);
  if (items) bodyParts.push(items);
  return {
    title: head,
    body: bodyParts.join('\n').slice(0, BEAN_ORDER_CREATED_OS_BODY_MAX),
  };
}

export function buildBeanOrderCreatedCopy(
  input: BeanOrderCreatedNotifyInput,
  locale = 'th',
): {
  headline: string;
  customerLine: string;
  summary: string;
  fieldSummary: string;
} {
  const headline = getBeanOrderCreatedHeadline(locale);
  const customerLine = resolveBeanOrderCreatedCustomerName(input);
  const summary = formatBeanOrderCreatedItemsSummary(input.lines, locale);
  return { headline, customerLine, summary, fieldSummary: summary };
}

/** Persist order-created event so FAB / mobile panel catch it via data_change_logs realtime. */
export async function recordBeanOrderCreatedNotification(
  input: BeanOrderCreatedNotifyInput,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, error: 'missing_supabase' };

  const locale = input.locale ?? 'th';
  const logId = beanOrderCreatedNotificationLogId(input.orderId);
  const { headline, customerLine, fieldSummary } = buildBeanOrderCreatedCopy(
    input,
    locale,
  );
  const url = `/${locale}/bean-orders/${input.orderId}`;
  const isTh = locale === 'th';

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('data_change_logs')
      .select('id, metadata')
      .eq('module', 'bean_orders')
      .eq('entity_type', 'bean_order_created')
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
        (row) => (row.metadata as Record<string, unknown> | null)?.kind === 'bean_order_created',
      )
    ) {
      return { success: true, skipped: true };
    }

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: new Date().toISOString(),
      actor_id: null,
      actor_label: isTh ? 'ระบบออเดอร์เมล็ด' : 'Bean order system',
      actor_access_level: 'system',
      action: 'CREATE',
      module: 'bean_orders',
      entity_type: 'bean_order_created',
      entity_id: input.orderId,
      entity_label: input.orderNo,
      field_changes: [],
      old_value: null,
      new_value: sanitizeJsonValue({
        customerName: resolveBeanOrderCreatedCustomerName(input),
        lines: input.lines,
      }),
      source: 'system',
      status: 'success',
      metadata: {
        kind: 'bean_order_created',
        notificationLogId: logId,
        title: headline,
        summary: customerLine,
        fieldSummary,
        url,
        locale,
        orderNo: input.orderNo,
        customerName: input.customerName,
        recipientName: input.recipientName,
        lines: input.lines,
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
    console.error('[recordBeanOrderCreatedNotification]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'record_failed',
    };
  }
}

export function isEligibleBeanOrderCreatedNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'bean_orders' || row.status !== 'success') return false;
  if (row.entity_type !== 'bean_order_created') return false;
  return row.metadata?.kind === 'bean_order_created';
}

function parseCreatedLines(metadata: Record<string, unknown>): BeanOrderCreatedLine[] {
  const raw = metadata.lines;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const line = entry as Record<string, unknown>;
    const itemName = typeof line.itemName === 'string' ? line.itemName : '';
    const weightValue =
      typeof line.weightValue === 'number'
        ? line.weightValue
        : typeof line.weightValue === 'string'
          ? Number(line.weightValue)
          : 0;
    const weightUnit = line.weightUnit === 'kg' ? 'kg' : 'g';
    if (!itemName.trim()) return [];
    return [{ itemName, weightValue, weightUnit }];
  });
}

export function formatBeanOrderCreatedNotification(
  row: DataChangeLogRow,
  locale: string,
): InventoryNotification {
  const meta = row.metadata ?? {};
  const logId =
    typeof meta.notificationLogId === 'string'
      ? meta.notificationLogId
      : beanOrderCreatedNotificationLogId(row.entity_id ?? row.id);

  const customerName = typeof meta.customerName === 'string' ? meta.customerName : null;
  const recipientName = typeof meta.recipientName === 'string' ? meta.recipientName : '';
  const lines = parseCreatedLines(meta);
  const headline = getBeanOrderCreatedHeadline(locale);
  const customerLine =
    customerName || recipientName
      ? resolveBeanOrderCreatedCustomerName({ customerName, recipientName })
      : typeof meta.summary === 'string' && meta.summary.trim()
        ? meta.summary.trim()
        : typeof meta.title === 'string' && meta.title.trim() && meta.title !== headline
          ? meta.title.trim()
          : locale === 'th'
            ? 'ลูกค้า'
            : 'Customer';
  const itemsSummary =
    lines.length > 0
      ? formatBeanOrderCreatedItemsSummary(lines, locale)
      : typeof meta.fieldSummary === 'string' && meta.fieldSummary.trim()
        ? meta.fieldSummary.trim()
        : typeof meta.summary === 'string' &&
            meta.summary.trim() &&
            meta.summary.trim() !== customerLine
          ? meta.summary.trim()
          : '';

  return {
    id: logId,
    logId,
    action: 'CREATE',
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    actorLabel: row.actor_label,
    occurredAt: row.occurred_at,
    title: headline,
    summary: customerLine,
    fieldSummary: itemsSummary,
    priority: 'high',
    read: false,
    batchedCount: 1,
    metadata: {
      ...meta,
      kind: 'bean_order_created',
      module: 'bean_orders',
      url:
        typeof meta.url === 'string'
          ? meta.url
          : `/${locale}/bean-orders/${row.entity_id ?? ''}`,
    },
  };
}
