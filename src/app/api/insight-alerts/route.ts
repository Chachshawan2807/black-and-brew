import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { evaluateAndDispatchInsights } from '@/lib/proactive-insights/evaluate-and-dispatch';
import {
  formatBangkokTime,
  INSIGHT_CRON_SCHEDULES,
  INSIGHT_CRON_TOLERANCE_MINUTES,
  isWithinInsightCronWindow,
  parseInsightAlertWindow,
} from '@/lib/proactive-insights/insight-schedule';
import { denyUnlessBearerSecret } from '@/lib/security/route-auth';

export const maxDuration = 45;

export async function GET(request: Request) {
  await headers();
  noStore();

  try {
    const denied = denyUnlessBearerSecret(request, process.env.CRON_SECRET, {
      logPrefix: '[CRON]',
      secretName: 'CRON_SECRET',
    });
    if (denied) return denied;

    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1';
    const window = parseInsightAlertWindow(url.searchParams.get('window'));
    const now = new Date();

    if (!force && !isWithinInsightCronWindow(window, now)) {
      const schedule = INSIGHT_CRON_SCHEDULES[window];
      console.warn(
        `[CRON] insight-alerts rejected outside ${window} window at ${formatBangkokTime(now)} ICT (expected ${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')} ±${INSIGHT_CRON_TOLERANCE_MINUTES}m)`,
      );
      return NextResponse.json({
        success: true,
        skipped: true,
        skipReason: 'outside_cron_window',
        window,
        bangkokTime: formatBangkokTime(now),
        expectedSchedule: schedule,
        toleranceMinutes: INSIGHT_CRON_TOLERANCE_MINUTES,
        timestamp: now.toISOString(),
      });
    }

    const result = await evaluateAndDispatchInsights({
      trigger: 'cron',
      locale: 'th',
      force,
      window,
    });

    const digestSent = Boolean(
      result.digest && result.pushed && !result.pushed.skipped && result.pushed.sent > 0,
    );

    return NextResponse.json({
      success: true,
      window,
      dateIso: result.dateIso,
      matchedRuleCount: result.matchedRules.length,
      matchedRules: result.matchedRules.map((insight) => insight.ruleId),
      digestSent,
      digestSkippedReason:
        result.recorded?.skipped && !force
          ? 'morning_push_already_dispatched'
          : result.pushed?.skipped && result.recorded && !result.recorded.skipped
            ? window === 'evening'
              ? 'evening_refresh_no_push'
              : 'push_skipped'
            : null,
      force,
      recorded: result.recorded,
      pushed: result.pushed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[CRON] insight-alerts Unexpected Error:', message);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
