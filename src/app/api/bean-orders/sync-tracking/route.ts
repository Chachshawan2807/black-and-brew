import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { syncBeanOrderTrackingStatuses } from '@/lib/bean-orders/sync-tracking';

export const maxDuration = 60;

function authorizeCron(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error('[CRON] Missing CRON_SECRET in environment');
    return NextResponse.json({ ok: false, error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('[CRON] Unauthorized sync-tracking access attempt');
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  await headers();
  noStore();

  const denied = authorizeCron(request);
  if (denied) return denied;

  try {
    const result = await syncBeanOrderTrackingStatuses();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('sync-tracking error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** Manual trigger (same auth as GET) — useful for cron-job.org POST jobs. */
export async function POST(request: Request) {
  await headers();
  noStore();

  const denied = authorizeCron(request);
  if (denied) return denied;

  try {
    const result = await syncBeanOrderTrackingStatuses();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('sync-tracking error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
