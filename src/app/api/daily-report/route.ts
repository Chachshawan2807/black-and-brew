import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import {
  compileDailyReportData,
  resolveDailyReportSchedule,
} from '@/app/actions/daily-report-actions';
import { buildDailyReportAltText } from '@/lib/daily-report-summary';
import { recordDailyReportNotificationLog } from '@/lib/daily-report-notification';
import { dispatchDailyReportWebPush } from '@/lib/daily-report-web-push';

export const maxDuration = 30;

export async function GET(request: Request) {
  await headers();
  noStore();

  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[CRON] Missing CRON_SECRET in environment');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[CRON] Unauthorized access attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const scheduleParam = new URL(request.url).searchParams.get('schedule');
    const schedule = resolveDailyReportSchedule(scheduleParam);

    const reportData = await compileDailyReportData(schedule);
    await recordDailyReportNotificationLog(reportData, 'th');
    const pushResult = await dispatchDailyReportWebPush(reportData);

    if (pushResult.error === 'vapid_not_configured') {
      console.error('[CRON] Web Push not configured — set VAPID keys on Vercel');
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

    return NextResponse.json({
      success: true,
      schedule,
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
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[CRON] Unexpected Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
