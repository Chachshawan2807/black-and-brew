import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { evaluateSecretaryAlerts } from '@/lib/secretary/alerts/evaluate-and-dispatch';
import { refreshDerivedSecretaryTasks } from '@/app/actions/secretary-actions';
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
    const locale = url.searchParams.get('locale') ?? 'th';
    const skipPush = url.searchParams.get('skipPush') === '1';
    const force = url.searchParams.get('force') === '1';

    await refreshDerivedSecretaryTasks({ locale });
    const result = await evaluateSecretaryAlerts({ locale, skipPush, force });

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[CRON] secretary-alerts Unexpected Error:', message);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
