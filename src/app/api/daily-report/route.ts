import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import {
  compileDailyReportData,
  parseDailyReportScheduleParam,
  resolveDailyReportSchedule,
  resolveDailyReportTargetIso,
} from '@/app/actions/daily-report-actions';
import { getBangkokCalendarIso } from '@/lib/date-utils';
import { buildDailyReportAltText } from '@/lib/daily-report-summary';
import {
  dailyReportNotificationLogId,
  markDailyReportWebPushDispatched,
  recordDailyReportNotificationLog,
  wasDailyReportWebPushDispatched,
} from '@/lib/daily-report-notification';
import { dispatchDailyReportWebPush } from '@/lib/daily-report-web-push';
import { evaluateAndDispatchInsights } from '@/lib/proactive-insights/evaluate-and-dispatch';
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

    const scheduleParam = new URL(request.url).searchParams.get('schedule');
    if (scheduleParam && !parseDailyReportScheduleParam(scheduleParam)) {
      return NextResponse.json(
        {
          success: false,
          error: 'invalid_schedule',
          message: 'Use ?schedule=today (05:00 ICT) or ?schedule=tomorrow (18:00 ICT)',
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const schedule = resolveDailyReportSchedule(scheduleParam, now);
    const bangkokTodayIso = getBangkokCalendarIso(now);
    const reportDateIso = resolveDailyReportTargetIso(schedule, now);

    const reportData = await compileDailyReportData(schedule, now);
    const logId = dailyReportNotificationLogId(reportData.schedule, reportData.dateStr);
    await recordDailyReportNotificationLog(reportData, 'th');

    const alreadyDispatched = await wasDailyReportWebPushDispatched(logId);
    const pushResult = alreadyDispatched
      ? {
          sent: 0,
          failed: 0,
          removed: 0,
          skipped: true,
          error: 'already_dispatched' as const,
        }
      : await dispatchDailyReportWebPush(reportData);

    if (!alreadyDispatched && pushResult.sent > 0) {
      await markDailyReportWebPushDispatched(logId);
    }

    if (pushResult.error === 'vapid_not_configured') {
      console.error('[CRON] Web Push not configured set VAPID keys on Vercel');
      return NextResponse.json(
        { success: false, error: 'Web Push VAPID keys not configured' },
        { status: 503 },
      );
    }

    if (pushResult.skipped && pushResult.sent === 0) {
      console.warn('[CRON] Daily report push skipped:', pushResult.error ?? 'unknown');
      return NextResponse.json({
        success: true,
        schedule,
        bangkokTodayIso,
        reportDateIso,
        dateStr: reportData.dateStr,
        channel: 'web_push',
        sent: 0,
        failed: 0,
        removed: pushResult.removed ?? 0,
        skipped: true,
        reason: pushResult.error ?? 'skipped',
        totalSubscriptions: pushResult.totalSubscriptions ?? 0,
        eligibleSubscriptions: pushResult.eligibleSubscriptions ?? 0,
        branchMatchedSubscriptions: pushResult.branchMatchedSubscriptions ?? 0,
        branchFallback: pushResult.branchFallback ?? false,
        failureStatusCounts: pushResult.failureStatusCounts ?? {},
        targetDeviceCounts: pushResult.targetDeviceCounts ?? {},
        sentDeviceCounts: pushResult.sentDeviceCounts ?? {},
        failedDeviceCounts: pushResult.failedDeviceCounts ?? {},
        removedDeviceCounts: pushResult.removedDeviceCounts ?? {},
        timestamp: new Date().toISOString(),
        previewText: buildDailyReportAltText(reportData).substring(0, 80),
      });
    }

    if (pushResult.failed > 0 && pushResult.sent === 0) {
      console.error('[CRON] Daily report Web Push failed for all subscriptions');
      return NextResponse.json(
        {
          success: false,
          error: 'web_push_delivery_failed',
          sent: pushResult.sent,
          failed: pushResult.failed,
          removed: pushResult.removed ?? 0,
          totalSubscriptions: pushResult.totalSubscriptions ?? 0,
          eligibleSubscriptions: pushResult.eligibleSubscriptions ?? 0,
          branchMatchedSubscriptions: pushResult.branchMatchedSubscriptions ?? 0,
          branchFallback: pushResult.branchFallback ?? false,
          failureStatusCounts: pushResult.failureStatusCounts ?? {},
          targetDeviceCounts: pushResult.targetDeviceCounts ?? {},
          sentDeviceCounts: pushResult.sentDeviceCounts ?? {},
          failedDeviceCounts: pushResult.failedDeviceCounts ?? {},
          removedDeviceCounts: pushResult.removedDeviceCounts ?? {},
        },
        { status: 502 },
      );
    }

    const previewText = buildDailyReportAltText(reportData);

    // Backup path: if the dedicated 07:00 insight cron was missed, run once with
    // the 18:00 tomorrow schedule job (deduped per day in data_change_logs).
    const insightResult =
      schedule === 'tomorrow'
        ? await evaluateAndDispatchInsights({ trigger: 'cron', locale: 'th' })
        : null;

    return NextResponse.json({
      success: true,
      schedule,
      bangkokTodayIso,
      reportDateIso,
      dateStr: reportData.dateStr,
      channel: 'web_push',
      sent: pushResult.sent,
      failed: pushResult.failed,
      removed: pushResult.removed ?? 0,
      totalSubscriptions: pushResult.totalSubscriptions ?? 0,
      eligibleSubscriptions: pushResult.eligibleSubscriptions ?? 0,
      branchMatchedSubscriptions: pushResult.branchMatchedSubscriptions ?? 0,
      branchFallback: pushResult.branchFallback ?? false,
      failureStatusCounts: pushResult.failureStatusCounts ?? {},
      targetDeviceCounts: pushResult.targetDeviceCounts ?? {},
      sentDeviceCounts: pushResult.sentDeviceCounts ?? {},
      failedDeviceCounts: pushResult.failedDeviceCounts ?? {},
      removedDeviceCounts: pushResult.removedDeviceCounts ?? {},
      timestamp: new Date().toISOString(),
      previewText: previewText.substring(0, 80) + (previewText.length > 80 ? '…' : ''),
      insightBackup: insightResult
        ? {
            dateIso: insightResult.dateIso,
            matchedRuleCount: insightResult.matchedRules.length,
            digestSent: Boolean(
              insightResult.digest && insightResult.pushed && !insightResult.pushed.skipped,
            ),
            recorded: insightResult.recorded,
            pushed: insightResult.pushed,
          }
        : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[CRON] Unexpected Error:', message);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
