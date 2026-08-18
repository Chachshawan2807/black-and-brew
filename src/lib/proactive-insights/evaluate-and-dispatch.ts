import { compileOperationalSnapshot } from '@/lib/proactive-insights/compile-operational-snapshot';
import { buildDailyInsightDigest, evaluateInsightRules } from '@/lib/proactive-insights/rules';
import type { Insight } from '@/lib/proactive-insights/types';
import { resolveInsightTargetDateIso } from '@/lib/proactive-insights/compile-operational-snapshot';
import {
  isRealtimeInsightTrigger,
  shouldDispatchInsightNotification,
  shouldForceInsightDigestRefresh,
  shouldPushInsightNotification,
  type InsightTrigger,
} from '@/lib/proactive-insights/insight-dispatch-triggers';
import {
  clearDailyInsightDigestLog,
  recordInsightNotificationLog,
  markInsightMorningPushDispatched,
  fetchDailyInsightDigestSummary,
} from '@/lib/insight-notification';
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

async function recordAndPushDigest(
  digest: Insight,
  dateIso: string,
  locale: string,
  trigger: InsightTrigger,
  matchedRules: Insight[],
  options: EvaluateInsightsOptions,
  recordForce: boolean,
): Promise<InsightDispatchResult> {
  const logResult = await recordInsightNotificationLog(digest, dateIso, locale, {
    trigger: trigger === 'cron' ? 'cron' : undefined,
    force: recordForce,
  });
  const recorded = {
    ruleId: digest.ruleId,
    logId: logResult.logId,
    skipped: Boolean(logResult.skipped),
  };

  if (logResult.skipped || options.skipPush || !shouldPushInsightNotification(trigger) || !logResult.success) {
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

export async function evaluateAndDispatchInsights(
  options: EvaluateInsightsOptions = {},
): Promise<InsightDispatchResult> {
  const trigger = options.trigger ?? 'cron';
  const locale = options.locale ?? 'th';
  const dateIso = options.dateIso ?? resolveInsightTargetDateIso();

  const snapshot = await compileOperationalSnapshot({ dateIso, locale });
  const matchedRules = evaluateInsightRules(snapshot);
  const digest = buildDailyInsightDigest(matchedRules);

  if (isRealtimeInsightTrigger(trigger)) {
    const existingSummary = await fetchDailyInsightDigestSummary(dateIso);
    const nextSummary = digest?.summary ?? null;

    if (existingSummary === nextSummary) {
      return {
        dateIso,
        trigger,
        matchedRules,
        digest,
        recorded: null,
        pushed: null,
      };
    }

    if (!digest) {
      if (existingSummary !== null) {
        await clearDailyInsightDigestLog(dateIso);
      }
      return {
        dateIso,
        trigger,
        matchedRules,
        digest: null,
        recorded: null,
        pushed: null,
      };
    }

    return recordAndPushDigest(
      digest,
      dateIso,
      locale,
      trigger,
      matchedRules,
      options,
      true,
    );
  }

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

  return recordAndPushDigest(
    digest,
    dateIso,
    locale,
    trigger,
    matchedRules,
    options,
    recordForce,
  );
}
