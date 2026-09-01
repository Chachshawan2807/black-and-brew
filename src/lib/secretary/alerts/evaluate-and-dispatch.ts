import { fetchSecretaryTasks } from '@/app/actions/secretary-actions';
import { fetchSecretarySnapshot } from '@/lib/secretary/adapters';
import {
  markSecretaryMorningPushDispatched,
  recordSecretaryNotificationLog,
} from '@/lib/secretary/alerts/secretary-notification-log';
import {
  buildSecretaryPushPayload,
  shouldSendSecretaryToSubscription,
} from '@/lib/secretary/alerts/secretary-notification';
import { generateSecretaryTaskOrder } from '@/lib/secretary/generate-task-order';
import { buildSummaryGuidance } from '@/lib/secretary/guidance-fallback';
import type { SecretaryTask } from '@/lib/secretary/types';
import {
  deliverWebPushPayload,
  ensureVapidConfigured,
  getSupabaseAdminForPush,
  WEB_PUSH_SCHEDULE_TTL_SECONDS,
  type PushSubscriptionRow,
} from '@/lib/web-push';

export async function dispatchSecretaryWebPush(opts: {
  tasks: SecretaryTask[];
  snapshot: Awaited<ReturnType<typeof fetchSecretarySnapshot>>;
  guidanceText: string;
  locale?: string;
}): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const locale = opts.locale ?? opts.snapshot.locale ?? 'th';
  const payload = buildSecretaryPushPayload(
    opts.tasks,
    opts.snapshot,
    locale,
    opts.guidanceText,
  );
  const admin = getSupabaseAdminForPush();
  const { data: subscriptions, error } = await admin.from('push_subscriptions').select('*');

  if (error) {
    console.error('Supabase Error:', error.message, error.details);
    return { sent: 0, failed: 0, skipped: true };
  }

  const payloadJson = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    url: payload.url,
    locale: payload.locale,
    notification: payload.notification,
    unreadCount: payload.unreadCount,
    assets: payload.assets,
  });

  let sent = 0;
  let failed = 0;

  for (const row of (subscriptions ?? []) as PushSubscriptionRow[]) {
    if (!shouldSendSecretaryToSubscription(payload.notification, row)) continue;

    const result = await deliverWebPushPayload(admin, row, payloadJson, {
      TTL: WEB_PUSH_SCHEDULE_TTL_SECONDS,
    });

    if (result.status === 'sent') sent += 1;
    else failed += 1;
  }

  return { sent, failed, skipped: false };
}

export async function evaluateSecretaryAlerts(opts?: {
  dateIso?: string;
  locale?: string;
  skipPush?: boolean;
  force?: boolean;
}): Promise<{
  dateIso: string;
  pendingCount: number;
  guidanceText: string;
  guidanceSource: string;
  recorded: { success: boolean; skipped?: boolean; logId: string };
  pushed: { sent: number; failed: number; skipped: boolean };
}> {
  const snapshot = await fetchSecretarySnapshot(opts);
  const locale = opts?.locale ?? snapshot.locale ?? 'th';

  const tasksResult = await fetchSecretaryTasks(snapshot.dateIso);
  const tasks = tasksResult.success && tasksResult.tasks ? tasksResult.tasks : [];

  const order = await generateSecretaryTaskOrder({ tasks, snapshot });
  const guidanceText = buildSummaryGuidance(order.orderedTasks, snapshot);
  const guidanceSource = order.source;

  const recorded = await recordSecretaryNotificationLog({
    tasks,
    snapshot,
    guidanceText,
    locale,
    force: opts?.force,
    trigger: 'cron',
  });

  let pushed = { sent: 0, failed: 0, skipped: true };
  if (!opts?.skipPush && !recorded.skipped) {
    pushed = await dispatchSecretaryWebPush({
      tasks,
      snapshot,
      guidanceText,
      locale,
    });

    if (pushed.sent > 0) {
      await markSecretaryMorningPushDispatched(recorded.logId, {
        scheduledPushDateIso: snapshot.dateIso,
      });
    }
  }

  const pendingCount = tasks.filter((task) => task.status === 'pending').length;

  return {
    dateIso: snapshot.dateIso,
    pendingCount,
    guidanceText,
    guidanceSource,
    recorded,
    pushed,
  };
}
