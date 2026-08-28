import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import {
  formatSecretaryNotification,
  secretaryNotificationLogId,
} from '@/lib/secretary/alerts/secretary-notification';
import { resolveSecretaryCronOccurredAt } from '@/lib/secretary/alerts/secretary-schedule';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export const SECRETARY_SCHEDULED_PUSH_DATE_KEY = 'scheduledPushDateIso';
export const SECRETARY_MORNING_PUSH_METADATA_KEY = 'morningPushDispatchedAt';

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

async function findSecretaryLogRow(supabase: SupabaseClient, logId: string) {
  const { data, error } = await supabase
    .from('data_change_logs')
    .select('id, metadata')
    .eq('module', 'secretary')
    .eq('entity_type', 'secretary_digest')
    .eq('entity_id', logId)
    .limit(1);

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      return { row: null, tableMissing: true };
    }
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  return { row: data?.[0] ?? null, tableMissing: false };
}

export function resolveCronSecretaryRecordAction(
  hasExisting: boolean,
  scheduledPushDateIso: string | undefined,
  todayIso: string,
  force?: boolean,
): 'insert' | 'update' | 'skip' | 'replace' {
  if (force) return hasExisting ? 'replace' : 'insert';
  if (scheduledPushDateIso === todayIso) return 'skip';
  if (!hasExisting) return 'insert';
  return 'update';
}

export async function markSecretaryMorningPushDispatched(
  logId: string,
  options?: { scheduledPushDateIso?: string },
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('data_change_logs')
      .select('id, metadata')
      .eq('module', 'secretary')
      .eq('entity_type', 'secretary_digest')
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
      [SECRETARY_MORNING_PUSH_METADATA_KEY]: new Date().toISOString(),
      ...(options?.scheduledPushDateIso
        ? { [SECRETARY_SCHEDULED_PUSH_DATE_KEY]: options.scheduledPushDateIso }
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
    console.error('[markSecretaryMorningPushDispatched] Exception:', error);
  }
}

export async function recordSecretaryNotificationLog(input: {
  tasks: SecretaryTask[];
  snapshot: SecretarySnapshot;
  guidanceText: string;
  locale?: string;
  force?: boolean;
  trigger?: 'cron' | 'manual';
}): Promise<{ success: boolean; skipped?: boolean; logId: string }> {
  const locale = input.locale ?? input.snapshot.locale ?? 'th';
  const logId = secretaryNotificationLogId(input.snapshot.dateIso);
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, logId };

  const notification = formatSecretaryNotification(
    input.tasks,
    input.snapshot,
    locale,
    input.guidanceText,
  );
  const isTh = locale === 'th';
  const metadata = {
    kind: 'secretary_digest',
    module: 'secretary',
    notificationLogId: logId,
    title: notification.title,
    summary: notification.summary,
    fieldSummary: notification.fieldSummary,
    guidanceText: input.guidanceText,
    locale,
    pendingCount: notification.metadata.pendingCount,
    isBranch2Day: input.snapshot.isBranch2Day,
    guidanceSource: 'morning_digest',
  };

  try {
    const { row: existingRow, tableMissing } = await findSecretaryLogRow(supabase, logId);
    if (tableMissing) return { success: false, logId };

    const existingMeta =
      typeof existingRow?.metadata === 'object' && existingRow.metadata !== null
        ? (existingRow.metadata as Record<string, unknown>)
        : undefined;
    const scheduledPushDateIso =
      typeof existingMeta?.[SECRETARY_SCHEDULED_PUSH_DATE_KEY] === 'string'
        ? existingMeta[SECRETARY_SCHEDULED_PUSH_DATE_KEY]
        : undefined;

    const action = resolveCronSecretaryRecordAction(
      Boolean(existingRow),
      scheduledPushDateIso,
      input.snapshot.dateIso,
      input.force,
    );

    if (action === 'skip') {
      return { success: true, skipped: true, logId };
    }

    const occurredAt =
      input.trigger === 'cron'
        ? resolveSecretaryCronOccurredAt(input.snapshot.dateIso)
        : new Date().toISOString();

    if (action === 'update' && existingRow) {
      const { error: updateError } = await supabase
        .from('data_change_logs')
        .update({
          occurred_at: occurredAt,
          actor_label: isTh ? 'เลขาส่วนตัว' : 'Personal Secretary',
          entity_label: input.snapshot.dateIso,
          new_value: sanitizeJsonValue({
            guidanceText: input.guidanceText,
            pendingCount: notification.metadata.pendingCount,
          }),
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
        .eq('module', 'secretary')
        .eq('entity_type', 'secretary_digest')
        .eq('entity_id', logId);

      if (deleteError) {
        console.error('Supabase Error:', deleteError.message, deleteError.details);
        throw deleteError;
      }
    }

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: occurredAt,
      actor_id: null,
      actor_label: isTh ? 'เลขาส่วนตัว' : 'Personal Secretary',
      actor_access_level: 'system',
      action: 'UPDATE',
      module: 'secretary',
      entity_type: 'secretary_digest',
      entity_id: logId,
      entity_label: input.snapshot.dateIso,
      field_changes: [],
      old_value: null,
      new_value: sanitizeJsonValue({
        guidanceText: input.guidanceText,
        pendingCount: notification.metadata.pendingCount,
      }),
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
    console.error('[recordSecretaryNotificationLog] Exception:', error);
    return { success: false, logId };
  }
}

export function formatSecretaryLogNotification(
  row: DataChangeLogRow,
  locale: string,
): import('@/lib/notification-types').InventoryNotification {
  const meta = row.metadata ?? {};
  const isTh = locale === 'th';
  const logId =
    typeof meta.notificationLogId === 'string'
      ? meta.notificationLogId
      : row.entity_id ?? row.id;
  const guidanceText =
    typeof meta.guidanceText === 'string'
      ? meta.guidanceText
      : typeof meta.summary === 'string'
        ? meta.summary
        : '';
  const title =
    typeof meta.title === 'string'
      ? meta.title
      : isTh
        ? 'เลขาส่วนตัว'
        : 'Personal Secretary';

  return {
    id: logId,
    logId,
    action: 'UPDATE',
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    actorLabel: row.actor_label,
    occurredAt: row.occurred_at,
    title,
    summary: guidanceText,
    fieldSummary: guidanceText,
    priority:
      typeof meta.pendingCount === 'number' && meta.pendingCount > 3 ? 'high' : 'normal',
    read: false,
    batchedCount: 1,
    metadata: {
      ...meta,
      kind: 'secretary_digest',
      module: 'secretary',
    },
  };
}
