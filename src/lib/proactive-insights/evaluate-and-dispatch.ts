import { compileOperationalSnapshot } from '@/lib/proactive-insights/compile-operational-snapshot';
import { buildDailyInsightDigest, evaluateInsightRules } from '@/lib/proactive-insights/rules';
import type { Insight } from '@/lib/proactive-insights/types';
import { resolveInsightTargetDateIso } from '@/lib/proactive-insights/compile-operational-snapshot';
import {
  shouldDispatchInsightNotification,
  shouldForceInsightDigestRefresh,
  type InsightTrigger,
} from '@/lib/proactive-insights/insight-dispatch-triggers';
import { recordInsightNotificationLog, markInsightMorningPushDispatched, fetchDailyInsightDigestSummary } from '@/lib/insight-notification';
import { dispatchInsightWebPush } from '@/lib/insight-web-push';

export type { InsightTrigger } from '@/lib/proactive-insights/insight-dispatch-triggers';

async function resolveInsightRecordForce(
  trigger: InsightTrigger,
  digest: Insight,
  dateIso: string,
  force?: boolean,
): Promise<boolean> {
  if (force) return true;
  const existingSummary = await fetchDailyInsightDigestSummary(dateIso);
  return shouldForceInsightDigestRefresh(trigger, existingSummary, digest.summary);
}

export type EvaluateInsightsOptions = {
  trigger?: InsightTrigger;
  dateIso?: string;
  locale?: string;
  /** Skip Web Push (still record data_change_logs). */
  skipPush?: boolean;
  /** Replace today's digest log and re-send push (for cron-job.org test runs). */
  force?: boolean;
};

export type InsightDispatchResult = {
  dateIso: string;
  trigger: InsightTrigger;
  /** Matched rule insights before daily digest merge. */
  matchedRules: Insight[];
  /** Daily digest sent to users (null when no rules matched). */
  digest: Insight | null;
  recorded: { ruleId: string; logId: string; skipped: boolean } | null;
  pushed: { ruleId: string; sent: number; failed: number; skipped: boolean } | null;
};

export async function evaluateAndDispatchInsights(
  options: EvaluateInsightsOptions = {},
): Promise<InsightDispatchResult> {
  const trigger = options.trigger ?? 'cron';
  const locale = options.locale ?? 'th';
  const dateIso = options.dateIso ?? resolveInsightTargetDateIso();

  const snapshot = await compileOperationalSnapshot({ dateIso, locale });
  const matchedRules = evaluateInsightRules(snapshot);
  const digest = buildDailyInsightDigest(matchedRules);

  if (!digest) {
    return {
      dateIso,
      trigger,
      matchedRules: [],
      digest: null,
      recorded: null,
      pushed: null,
    };
  }

  // Daily digest is push/logged from the scheduled cron and bean-order mutations.
  if (!shouldDispatchInsightNotification(trigger, matchedRules)) {
    return {
      dateIso,
      trigger,
      matchedRules,
      digest,
      recorded: null,
      pushed: null,
    };
  }

  const recordForce =
    trigger === 'cron'
      ? Boolean(options.force)
      : await resolveInsightRecordForce(trigger, digest, dateIso, options.force);
  const logResult = await recordInsightNotificationLog(digest, dateIso, locale, {
    trigger: trigger === 'cron' ? 'cron' : undefined,
    force: recordForce,
  });
  const recorded = {
    ruleId: digest.ruleId,
    logId: logResult.logId,
    skipped: Boolean(logResult.skipped),
  };

  if (logResult.skipped || options.skipPush || !logResult.success) {
    return {
      dateIso,
      trigger,
      matchedRules,
      digest,
      recorded,
      pushed: {
        ruleId: digest.ruleId,
        sent: 0,
        failed: 0,
        skipped: true,
      },
    };
  }

  const pushResult = await dispatchInsightWebPush(digest, dateIso);

  if (pushResult.sent > 0) {
    await markInsightMorningPushDispatched(logResult.logId, {
      scheduledPushDateIso: trigger === 'cron' ? dateIso : undefined,
    });
  }

  return {
    dateIso,
    trigger,
    matchedRules,
    digest,
    recorded,
    pushed: {
      ruleId: digest.ruleId,
      sent: pushResult.sent,
      failed: pushResult.failed,
      skipped: pushResult.skipped,
    },
  };
}
