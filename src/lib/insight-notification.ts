import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import type { InventoryNotification, NotificationPriority } from '@/lib/notification-types';
import type { Insight, InsightRuleId } from '@/lib/proactive-insights/types';
import type { InsightTrigger } from '@/lib/proactive-insights/evaluate-and-dispatch';
import { resolveInsightCronOccurredAt } from '@/lib/proactive-insights/insight-schedule';

export const INSIGHT_MORNING_PUSH_METADATA_KEY = 'morningPushDispatchedAt';
/** ICT calendar date when the scheduled daily cron last pushed this digest. */
export const INSIGHT_SCHEDULED_PUSH_DATE_KEY = 'scheduledPushDateIso';

export function insightNotificationLogId(ruleId: InsightRuleId | string, dateIso: string): string {
  return `bb-insight-${ruleId}-${dateIso}`;
}

export function dailyInsightDigestLogId(dateIso: string): string {
  return insightNotificationLogId('daily_digest', dateIso);
}

/** Latest stored summary for today's daily digest (null when no log yet). */
export async function fetchDailyInsightDigestSummary(dateIso: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const logId = dailyInsightDigestLogId(dateIso);
  try {
    const { data, error } = await supabase
      .from('data_change_logs')
      .select('metadata')
      .eq('module', 'insights')
      .eq('entity_type', 'cross_module_insight')
      .eq('entity_id', logId)
      .limit(1);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return null;
    }

    const meta = data?.[0]?.metadata;
    if (typeof meta !== 'object' || meta === null) return null;
    const summary = (meta as Record<string, unknown>).summary;
    return typeof summary === 'string' ? summary : null;
  } catch (error) {
    console.error('[fetchDailyInsightDigestSummary] Exception:', error);
    return null;
  }
}

/** Cron record path: insert, refresh stale log, skip after morning push, or force replace. */
export function resolveCronInsightRecordAction(
  hasExisting: boolean,
  morningPushDispatchedAt: string | undefined,
  force?: boolean,
  scheduled?: { todayIso: string; scheduledPushDateIso?: string },
): 'insert' | 'update' | 'skip' | 'replace' {
  if (force) return 'replace';

  if (scheduled) {
    if (scheduled.scheduledPushDateIso === scheduled.todayIso) {
      return 'skip';
    }
    if (!hasExisting) return 'insert';
    return 'update';
  }

  if (!hasExisting) return 'insert';
  if (morningPushDispatchedAt) return 'skip';
  return 'update';
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
        ? 'การแจ้งเตือนที่ต้องตรวจสอบ'
        : 'Alerts to review';
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

function buildInsightLogMetadata(
  insight: Insight,
  logId: string,
  locale: string,
  url: string,
): Record<string, unknown> {
  return {
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
  };
}

/** Mark daily digest Web Push as delivered so duplicate cron hits skip re-send. */
export async function markInsightMorningPushDispatched(
  logId: string,
  options?: { scheduledPushDateIso?: string },
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('data_change_logs')
      .select('id, metadata')
      .eq('module', 'insights')
      .eq('entity_type', 'cross_module_insight')
      .eq('entity_id', logId)
      .limit(1);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    const row = data?.[0];
    if (!row) return;

    const metadata = {
      ...(typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {}),
      [INSIGHT_MORNING_PUSH_METADATA_KEY]: new Date().toISOString(),
      ...(options?.scheduledPushDateIso
        ? { [INSIGHT_SCHEDULED_PUSH_DATE_KEY]: options.scheduledPushDateIso }
        : {}),
    };

    const { error: updateError } = await supabase
      .from('data_change_logs')
      .update({ metadata })
      .eq('id', row.id);

    if (updateError) {
      console.error('Supabase Error:', updateError.message, updateError.details);
      throw updateError;
    }
  } catch (error) {
    console.error('[markInsightMorningPushDispatched] Exception:', error);
  }
}

/** Persist insight so the in-app panel can catch up. Dedupes morning push per calendar day. */
export async function recordInsightNotificationLog(
  insight: Insight,
  dateIso: string,
  locale = 'th',
  options?: { trigger?: InsightTrigger; force?: boolean },
): Promise<{ success: boolean; skipped?: boolean; logId: string }> {
  const logId = insightNotificationLogId(insight.ruleId, dateIso);
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, logId };

  const isTh = locale === 'th';
  const url = `/${locale}${insight.urlPath}`;
  const metadata = buildInsightLogMetadata(insight, logId, locale, url);

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('data_change_logs')
      .select('id, metadata')
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

    const existingRow = existing?.[0];
    const existingMeta =
      typeof existingRow?.metadata === 'object' && existingRow.metadata !== null
        ? (existingRow.metadata as Record<string, unknown>)
        : undefined;
    const morningPushDispatchedAt =
      typeof existingMeta?.[INSIGHT_MORNING_PUSH_METADATA_KEY] === 'string'
        ? existingMeta[INSIGHT_MORNING_PUSH_METADATA_KEY]
        : undefined;
    const scheduledPushDateIso =
      typeof existingMeta?.[INSIGHT_SCHEDULED_PUSH_DATE_KEY] === 'string'
        ? existingMeta[INSIGHT_SCHEDULED_PUSH_DATE_KEY]
        : undefined;

    const action = resolveCronInsightRecordAction(
      Boolean(existingRow),
      morningPushDispatchedAt,
      options?.force,
      options?.trigger === 'cron' ? { todayIso: dateIso, scheduledPushDateIso } : undefined,
    );

    if (action === 'skip') {
      return { success: true, skipped: true, logId };
    }

    const occurredAt =
      options?.trigger === 'cron'
        ? resolveInsightCronOccurredAt(dateIso)
        : new Date().toISOString();

    if (action === 'update' && existingRow) {
      const { error: updateError } = await supabase
        .from('data_change_logs')
        .update({
          occurred_at: occurredAt,
          actor_label: isTh ? 'ระบบการแจ้งเตือนที่ต้องตรวจสอบ' : 'Review alerts',
          entity_label: dateIso,
          new_value: sanitizeJsonValue(insight),
          metadata,
        })
        .eq('id', existingRow.id);

      if (updateError) {
        console.error('Supabase Error:', updateError.message, updateError.details);
        throw updateError;
      }

      return { success: true, logId };
    }

    if (action === 'replace' && existingRow) {
      const { error: deleteError } = await supabase
        .from('data_change_logs')
        .delete()
        .eq('module', 'insights')
        .eq('entity_type', 'cross_module_insight')
        .eq('entity_id', logId);

      if (deleteError) {
        console.error('Supabase Error:', deleteError.message, deleteError.details);
        throw deleteError;
      }
    }

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: occurredAt,
      actor_id: null,
      actor_label: isTh ? 'ระบบการแจ้งเตือนที่ต้องตรวจสอบ' : 'Review alerts',
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
      metadata,
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
