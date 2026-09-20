import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { InventoryNotification } from '@/lib/notification-types';
import { isEligibleDailyReportNotification } from '@/lib/daily-report-notification-format';
import { formatDailyReportNotification } from '@/lib/daily-report-notification-format';
import {
  isEligibleBeanOrderCreatedNotification,
  formatBeanOrderCreatedNotification,
} from '@/lib/bean-orders/created-notification';
import {
  isEligibleBeanOrderDeliveredNotification,
  formatBeanOrderDeliveredNotification,
} from '@/lib/bean-orders/delivery-notification';
import {
  isEligibleBeanOrderPaymentNotification,
  formatBeanOrderPaymentNotification,
} from '@/lib/bean-orders/payment-notification';
import {
  isEligibleBeanOrderShippedNotification,
  formatBeanOrderShippedNotification,
} from '@/lib/bean-orders/shipment-notification';
import {
  isEligibleInsightNotification,
  formatInsightNotification,
} from '@/lib/insight-notification';
import {
  isEligibleSecurityNotification,
  formatSecurityNotification,
} from '@/lib/security-notification';
import { isEligibleInventoryNotification } from '@/lib/inventory-notification-filter';
import { formatInventoryNotification } from '@/lib/inventory-notification-formatter';
import { getNotificationCatchUpLimit } from '@/lib/dev-runtime';
import { isAfterNotificationClearWatermark } from '@/lib/notification-storage';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const CATCH_UP_MODULES = ['inventory', 'schedule', 'bean_orders', 'insights', 'security'] as const;

const DATA_CHANGE_LOG_SELECT =
  'id, occurred_at, actor_id, actor_label, actor_access_level, action, module, entity_type, entity_id, entity_label, field_changes, old_value, new_value, source, ip_address, user_agent, status, error_message, metadata';

const LOCALE = 'th';

function parseEnvLocal(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n#]+)"?\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function formatNotificationRow(row: DataChangeLogRow, batchedCount = 1): InventoryNotification {
  if (isEligibleDailyReportNotification(row)) {
    return formatDailyReportNotification(row, LOCALE);
  }
  if (isEligibleBeanOrderCreatedNotification(row)) {
    return formatBeanOrderCreatedNotification(row, LOCALE);
  }
  if (isEligibleBeanOrderDeliveredNotification(row)) {
    return formatBeanOrderDeliveredNotification(row, LOCALE);
  }
  if (isEligibleBeanOrderShippedNotification(row)) {
    return formatBeanOrderShippedNotification(row, LOCALE);
  }
  if (isEligibleBeanOrderPaymentNotification(row)) {
    return formatBeanOrderPaymentNotification(row, LOCALE);
  }
  if (isEligibleInsightNotification(row)) {
    return formatInsightNotification(row, LOCALE);
  }
  if (isEligibleSecurityNotification(row)) {
    return formatSecurityNotification(row, LOCALE);
  }
  return formatInventoryNotification(row, LOCALE, batchedCount);
}

/** Same eligibility as notification hub catch-up with default prefs and no clear watermark. */
function filterEligibleCatchUpRows(rows: DataChangeLogRow[]): DataChangeLogRow[] {
  const clearWatermark = null;
  return rows.filter((row) => {
    if (!isAfterNotificationClearWatermark(row.occurred_at, clearWatermark)) return false;

    const isDailyReport = isEligibleDailyReportNotification(row);
    const isInventory = isEligibleInventoryNotification(row);
    const isBeanCreated = isEligibleBeanOrderCreatedNotification(row);
    const isBeanDelivered = isEligibleBeanOrderDeliveredNotification(row);
    const isBeanShipped = isEligibleBeanOrderShippedNotification(row);
    const isBeanPayment = isEligibleBeanOrderPaymentNotification(row);
    const isInsight = isEligibleInsightNotification(row);
    const isSecurity = isEligibleSecurityNotification(row);

    return (
      isDailyReport ||
      isInventory ||
      isBeanCreated ||
      isBeanDelivered ||
      isBeanShipped ||
      isBeanPayment ||
      isInsight ||
      isSecurity
    );
  });
}

export async function buildScreenshotNotificationSeedJson(): Promise<string | null> {
  let envText = '';
  try {
    envText = fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8');
  } catch {
    return null;
  }

  const env = parseEnvLocal(envText);
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const limit = getNotificationCatchUpLimit();
  const { data, error } = await supabase
    .from('data_change_logs')
    .select(DATA_CHANGE_LOG_SELECT)
    .in('module', [...CATCH_UP_MODULES])
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return null;

  const eligible = filterEligibleCatchUpRows(data as DataChangeLogRow[]);
  if (eligible.length === 0) return null;

  const notifications: InventoryNotification[] = [...eligible]
    .reverse()
    .map((row) => formatNotificationRow(row));

  return JSON.stringify(notifications);
}
