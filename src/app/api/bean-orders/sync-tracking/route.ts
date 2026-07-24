import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { syncBeanOrderTrackingStatuses } from '@/lib/bean-orders/sync-tracking';
import { denyUnlessBearerSecret } from '@/lib/security/route-auth';

export const maxDuration = 60;

function authorizeCron(request: Request): NextResponse | null {
  return denyUnlessBearerSecret(request, process.env.CRON_SECRET, {
    logPrefix: '[CRON]',
    secretName: 'CRON_SECRET',
  });
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
