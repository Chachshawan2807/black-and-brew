import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache'; // 💡 เรียกตัวนี้กลับมาช่วยคุมหลังบ้าน
import { compileDailyReportPayload } from '@/app/actions/daily-report-actions';
import { sendLineNotification } from '@/app/actions/line-actions';

// ลบ export const dynamic ออกไปแล้วตามคำสั่งของระบบ
export const maxDuration = 30;

export async function GET(request: Request) {
  // 💡 ใช้ noStore() บรรทัดแรกสุด เพื่อสั่งให้ข้ามการทำ Prerender ตอนรันไทม์โดยไม่ขัดกับระบบแคชหลัก
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

    const message = await compileDailyReportPayload();
    const result = await sendLineNotification(targetRecipientId, message);

    if (!result.success) {
      console.error('[CRON] Failed to send LINE notification:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      previewText: message.substring(0, 50) + '...'
    });

  } catch (error: any) {
    console.error('[CRON] Unexpected Error:', error.message || error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}