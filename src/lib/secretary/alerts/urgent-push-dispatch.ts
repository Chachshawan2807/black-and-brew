import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  buildSecretaryDigestSummary,
  shouldSendSecretaryToSubscription,
} from '@/lib/secretary/alerts/secretary-notification';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { buildInventoryOsNotification } from '@/lib/pwa-notification-bridge';
import { buildPwaNotificationAssetPaths } from '@/lib/pwa-assets';
import {
  deliverWebPushPayload,
  ensureVapidConfigured,
  getSupabaseAdminForPush,
  WEB_PUSH_SCHEDULE_TTL_SECONDS,
  type PushSubscriptionRow,
} from '@/lib/web-push';

export const SECRETARY_URGENT_PUSH_COOLDOWN_MS = 3 * 60 * 60 * 1000;

function urgentPushLogId(dateIso: string): string {
  return `secretary-urgent-${dateIso}`;
}

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function isActionableUrgent(task: SecretaryTask, nowIso: string): boolean {
  if (task.priority !== 'urgent') return false;
  if (task.status !== 'pending' && task.status !== 'in_progress') return false;
  if (task.snoozed_until && task.snoozed_until > nowIso) return false;
  return true;
}

type UrgentPushState = {
  pushedTaskIds: string[];
  pushedAt: string | null;
  cooldownUntil: string | null;
};

async function readUrgentPushState(
  supabase: SupabaseClient,
  dateIso: string,
): Promise<UrgentPushState> {
  const logId = urgentPushLogId(dateIso);
  const { data, error } = await supabase
    .from('data_change_logs')
    .select('metadata')
    .eq('module', 'secretary')
    .eq('entity_type', 'secretary_urgent_push')
    .eq('entity_id', logId)
    .maybeSingle();

  if (error || !data?.metadata || typeof data.metadata !== 'object') {
    return { pushedTaskIds: [], pushedAt: null, cooldownUntil: null };
  }

  const meta = data.metadata as Record<string, unknown>;
  return {
    pushedTaskIds: Array.isArray(meta.pushedTaskIds)
      ? meta.pushedTaskIds.filter((id): id is string => typeof id === 'string')
      : [],
    pushedAt: typeof meta.pushedAt === 'string' ? meta.pushedAt : null,
    cooldownUntil: typeof meta.cooldownUntil === 'string' ? meta.cooldownUntil : null,
  };
}

async function writeUrgentPushState(
  supabase: SupabaseClient,
  dateIso: string,
  state: UrgentPushState,
): Promise<void> {
  const logId = urgentPushLogId(dateIso);
  const metadata = {
    kind: 'secretary_urgent',
    module: 'secretary',
    pushedTaskIds: state.pushedTaskIds,
    pushedAt: state.pushedAt,
    cooldownUntil: state.cooldownUntil,
  };

  const { data: existing } = await supabase
    .from('data_change_logs')
    .select('id')
    .eq('module', 'secretary')
    .eq('entity_type', 'secretary_urgent_push')
    .eq('entity_id', logId)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('data_change_logs')
      .update({ metadata, occurred_at: state.pushedAt ?? new Date().toISOString() })
      .eq('id', existing.id);
    return;
  }

  await supabase.from('data_change_logs').insert({
    occurred_at: state.pushedAt ?? new Date().toISOString(),
    actor_id: null,
    actor_label: 'เลขาส่วนตัว',
    actor_access_level: 'system',
    action: 'UPDATE',
    module: 'secretary',
    entity_type: 'secretary_urgent_push',
    entity_id: logId,
    entity_label: dateIso,
    field_changes: [],
    old_value: null,
    new_value: metadata,
    source: 'system',
    status: 'success',
    metadata,
  });
}

export function resolveNewUrgentTaskIds(
  tasks: SecretaryTask[],
  previouslyPushedIds: string[],
  nowIso = new Date().toISOString(),
): string[] {
  const urgentIds = tasks
    .filter((task) => isActionableUrgent(task, nowIso))
    .map((task) => task.id);
  const seen = new Set(previouslyPushedIds);
  return urgentIds.filter((id) => !seen.has(id));
}

export function shouldDispatchUrgentPush(
  newUrgentIds: string[],
  state: UrgentPushState,
  now = Date.now(),
): boolean {
  if (newUrgentIds.length === 0) return false;
  if (!state.cooldownUntil) return true;
  const cooldownUntilMs = Date.parse(state.cooldownUntil);
  if (Number.isNaN(cooldownUntilMs)) return true;
  return now >= cooldownUntilMs;
}

export async function maybeDispatchSecretaryUrgentPush(opts: {
  snapshot: SecretarySnapshot;
  tasks: SecretaryTask[];
  locale?: string;
}): Promise<{ sent: number; failed: number; skipped: boolean; reason?: string }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0, skipped: true, reason: 'vapid_missing' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { sent: 0, failed: 0, skipped: true, reason: 'supabase_missing' };
  }

  const nowIso = new Date().toISOString();
  const state = await readUrgentPushState(admin, opts.snapshot.dateIso);
  const newUrgentIds = resolveNewUrgentTaskIds(opts.tasks, state.pushedTaskIds, nowIso);

  if (!shouldDispatchUrgentPush(newUrgentIds, state)) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      reason: newUrgentIds.length === 0 ? 'no_new_urgent' : 'cooldown',
    };
  }

  const locale = opts.locale ?? opts.snapshot.locale ?? 'th';
  const newUrgentTasks = opts.tasks.filter((task) => newUrgentIds.includes(task.id));
  const digest = buildSecretaryDigestSummary(opts.tasks, opts.snapshot);
  const urgentTitles = newUrgentTasks.map((task) => task.title).join(', ');
  const body = `งานเร่งด่วนใหม่: ${urgentTitles}`;
  const os = buildInventoryOsNotification('เลขาส่วนตัว เร่งด่วน', body, 1, locale === 'th', {
    fieldSummary: body,
  });

  const notification = {
    id: urgentPushLogId(opts.snapshot.dateIso),
    logId: urgentPushLogId(opts.snapshot.dateIso),
    action: 'UPDATE' as const,
    entityId: opts.snapshot.dateIso,
    entityLabel: opts.snapshot.dateIso,
    actorLabel: locale === 'th' ? 'เลขาส่วนตัว' : 'Personal Secretary',
    occurredAt: nowIso,
    title: os.title,
    summary: body,
    fieldSummary: body,
    priority: 'high' as const,
    read: false,
    batchedCount: 1,
    metadata: {
      kind: 'secretary_urgent',
      module: 'secretary',
      url: `/${locale}/secretary`,
      pendingCount: digest.pendingCount,
      urgentTaskIds: newUrgentIds,
    },
  };

  const payloadJson = JSON.stringify({
    title: os.title,
    body: os.body,
    tag: `secretary-urgent-${opts.snapshot.dateIso}`,
    url: `/${locale}/secretary`,
    locale,
    notification,
    unreadCount: newUrgentIds.length,
    assets: buildPwaNotificationAssetPaths(),
    kind: 'secretary_urgent',
  });

  const pushAdmin = getSupabaseAdminForPush();
  const { data: subscriptions, error } = await pushAdmin.from('push_subscriptions').select('*');
  if (error) {
    console.error('Supabase Error:', error.message, error.details);
    return { sent: 0, failed: 0, skipped: true, reason: 'subscription_fetch_failed' };
  }

  let sent = 0;
  let failed = 0;

  for (const row of (subscriptions ?? []) as PushSubscriptionRow[]) {
    if (!shouldSendSecretaryToSubscription(notification, row)) continue;

    const result = await deliverWebPushPayload(pushAdmin, row, payloadJson, {
      TTL: WEB_PUSH_SCHEDULE_TTL_SECONDS,
    });

    if (result.status === 'sent') sent += 1;
    else failed += 1;
  }

  if (sent > 0) {
    const pushedAt = nowIso;
    const cooldownUntil = new Date(Date.now() + SECRETARY_URGENT_PUSH_COOLDOWN_MS).toISOString();
    await writeUrgentPushState(admin, opts.snapshot.dateIso, {
      pushedTaskIds: [...new Set([...state.pushedTaskIds, ...newUrgentIds])],
      pushedAt,
      cooldownUntil,
    });
  }

  return { sent, failed, skipped: sent === 0 };
}
