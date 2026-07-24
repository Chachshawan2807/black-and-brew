import { compileOperationalSnapshot } from '@/lib/proactive-insights/compile-operational-snapshot';
import { evaluateInsightRules } from '@/lib/proactive-insights/rules';
import type { Insight, InsightWindow } from '@/lib/proactive-insights/types';
import { resolveInsightTargetDateIso } from '@/lib/proactive-insights/compile-operational-snapshot';
import { recordInsightNotificationLog } from '@/lib/insight-notification';
import { dispatchInsightWebPush } from '@/lib/insight-web-push';

export type InsightTrigger = 'cron' | 'shift_update' | 'inventory_update' | 'manual';

export type EvaluateInsightsOptions = {
  window?: InsightWindow;
  trigger?: InsightTrigger;
  dateIso?: string;
  locale?: string;
  /** Skip Web Push (still record data_change_logs). */
  skipPush?: boolean;
};

export type InsightDispatchResult = {
  dateIso: string;
  trigger: InsightTrigger;
  insights: Insight[];
  recorded: Array<{ ruleId: string; logId: string; skipped: boolean }>;
  pushed: Array<{ ruleId: string; sent: number; failed: number; skipped: boolean }>;
};

export async function evaluateAndDispatchInsights(
  options: EvaluateInsightsOptions = {},
): Promise<InsightDispatchResult> {
  const trigger = options.trigger ?? 'cron';
  const window = options.window ?? 'morning';
  const locale = options.locale ?? 'th';
  const dateIso = options.dateIso ?? resolveInsightTargetDateIso(window);

  const snapshot = await compileOperationalSnapshot({ dateIso, locale });
  const insights = evaluateInsightRules(snapshot);

  const recorded: InsightDispatchResult['recorded'] = [];
  const pushed: InsightDispatchResult['pushed'] = [];

  for (const insight of insights) {
    const logResult = await recordInsightNotificationLog(insight, dateIso, locale);
    recorded.push({
      ruleId: insight.ruleId,
      logId: logResult.logId,
      skipped: Boolean(logResult.skipped),
    });

    // Dedup: do not re-push if already recorded today.
    if (logResult.skipped || options.skipPush) {
      pushed.push({
        ruleId: insight.ruleId,
        sent: 0,
        failed: 0,
        skipped: true,
      });
      continue;
    }

    if (!logResult.success) {
      pushed.push({
        ruleId: insight.ruleId,
        sent: 0,
        failed: 0,
        skipped: true,
      });
      continue;
    }

    const pushResult = await dispatchInsightWebPush(insight, dateIso);
    pushed.push({
      ruleId: insight.ruleId,
      sent: pushResult.sent,
      failed: pushResult.failed,
      skipped: pushResult.skipped,
    });
  }

  return { dateIso, trigger, insights, recorded, pushed };
}
