import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import type { InventoryNotification, NotificationPriority } from '@/lib/notification-types';
import type { Insight, InsightRuleId } from '@/lib/proactive-insights/types';
import type { InsightTrigger } from '@/lib/proactive-insights/evaluate-and-dispatch';
import { resolveInsightCronOccurredAt } from '@/lib/proactive-insights/insight-schedule';

export function insightNotificationLogId(ruleId: InsightRuleId | string, dateIso: string): string {
  return `bb-insight-${ruleId}-${dateIso}`;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

export function isEligibleInsightNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'insights' || row.status !== 'success') return false;
  if (row.entity_type !== 'cross_module_insight') return false;
  const meta = row.metadata ?? {};
  return meta.kind === 'proactive_insight';
}

export function formatInsightNotification(
  row: DataChangeLogRow,
  locale: string,
): InventoryNotification {
  const meta = row.metadata ?? {};
  const isTh = locale === 'th';
  const logId =
    typeof meta.notificationLogId === 'string'
      ? meta.notificationLogId
      : row.entity_id ?? row.id;
  const title =
    typeof meta.title === 'string'
      ? meta.title
      : isTh
        ? 'แจ้งเตือนเชิงรุก'
        : 'Proactive insight';
  const fieldSummary =
    typeof meta.fieldSummary === 'string'
      ? meta.fieldSummary
      : typeof meta.summary === 'string'
        ? meta.summary
        : '';
  const summary =
    typeof meta.summary === 'string'
      ? meta.summary.split('\n').filter(Boolean)[0] ?? meta.summary
      : fieldSummary.split('\n').filter(Boolean)[0] ?? '';
  const priority: NotificationPriority =
    meta.priority === 'high' ? 'high' : 'normal';

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
    priority,
    read: false,
    batchedCount: 1,
    metadata: {
      ...meta,
      kind: 'proactive_insight',
      module: 'insights',
    },
  };
}

/** Persist insight so the in-app panel can catch up. Dedupes by entity_id per day. */
export async function recordInsightNotificationLog(
  insight: Insight,
  dateIso: string,
  locale = 'th',
  options?: { trigger?: InsightTrigger },
): Promise<{ success: boolean; skipped?: boolean; logId: string }> {
  const logId = insightNotificationLogId(insight.ruleId, dateIso);
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, logId };

  const isTh = locale === 'th';
  const url = `/${locale}${insight.urlPath}`;

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('data_change_logs')
      .select('id')
      .eq('module', 'insights')
      .eq('entity_type', 'cross_module_insight')
      .eq('entity_id', logId)
      .limit(1);

    if (lookupError) {
      if (lookupError.code === 'PGRST205' || lookupError.message?.includes('Could not find the table')) {
        return { success: false, logId };
      }
      console.error('Supabase Error:', lookupError.message, lookupError.details);
      throw lookupError;
    }

    if (existing && existing.length > 0) {
      return { success: true, skipped: true, logId };
    }

    const occurredAt =
      options?.trigger === 'cron'
        ? resolveInsightCronOccurredAt(dateIso)
        : new Date().toISOString();

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: occurredAt,
      actor_id: null,
      actor_label: isTh ? 'ระบบแจ้งเตือนเชิงรุก' : 'Proactive insights',
      actor_access_level: 'system',
      action: 'UPDATE',
      module: 'insights',
      entity_type: 'cross_module_insight',
      entity_id: logId,
      entity_label: dateIso,
      field_changes: [],
      old_value: null,
      new_value: sanitizeJsonValue(insight),
      source: 'system',
      status: 'success',
      metadata: {
        kind: 'proactive_insight',
        ruleId: insight.ruleId,
        url,
        notificationLogId: logId,
        title: insight.title,
        summary: insight.summary,
        fieldSummary: insight.summary,
        locale,
        modules: insight.modules,
        priority: insight.priority,
      },
    });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return { success: false, logId };
      }
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    return { success: true, logId };
  } catch (error) {
    console.error('[recordInsightNotificationLog] Exception:', error);
    return { success: false, logId };
  }
}
