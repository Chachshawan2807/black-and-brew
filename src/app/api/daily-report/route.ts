import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache'; 
import { headers } from 'next/headers';
import {
  compileDailyReportData,
  resolveDailyReportSchedule,
} from '@/app/actions/daily-report-actions';
import { buildDailyReportAltText, buildDailyReportFlexMessage } from '@/lib/line/daily-report-flex';
import { pushLineMessages } from '@/lib/line-notify';

export const maxDuration = 30;

export async function GET(request: Request) {
  // บังคับข้ามการทำแคช Prerender โดยใช้ dynamic api
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

    const targetRecipientId = process.env.LINE_GROUP_ID || process.env.LINE_TARGET_RECIPIENT_ID;

    if (!targetRecipientId) {
      console.error('[CRON] Missing target ID (LINE_GROUP_ID / LINE_TARGET_RECIPIENT_ID) in environment');
      return NextResponse.json({ success: false, error: 'Missing target ID' }, { status: 500 });
    }

    const scheduleParam = new URL(request.url).searchParams.get('schedule');
    const schedule = resolveDailyReportSchedule(scheduleParam);

    const reportData = await compileDailyReportData(schedule);
    const flexMessage = buildDailyReportFlexMessage(reportData);
    const result = await pushLineMessages(targetRecipientId, [flexMessage]);

    if (!result.success) {
      console.error('[CRON] Failed to send LINE notification:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    const previewText = buildDailyReportAltText(reportData);

    return NextResponse.json({
      success: true,
      schedule,
      format: 'flex',
      timestamp: new Date().toISOString(),
      previewText: previewText.substring(0, 80) + (previewText.length > 80 ? '…' : ''),
    });

  } catch (error: any) {
    console.error('[CRON] Unexpected Error:', error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}