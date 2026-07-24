import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
import { evaluateAndDispatchInsights } from '@/lib/proactive-insights/evaluate-and-dispatch';
import type { InsightWindow } from '@/lib/proactive-insights/types';
import { denyUnlessBearerSecret } from '@/lib/security/route-auth';

export const maxDuration = 45;

function resolveInsightWindow(raw: string | null): InsightWindow {
  return raw === 'evening' ? 'evening' : 'morning';
}

export async function GET(request: Request) {
  await headers();
  noStore();

  try {
    const denied = denyUnlessBearerSecret(request, process.env.CRON_SECRET, {
      logPrefix: '[CRON]',
      secretName: 'CRON_SECRET',
    });
    if (denied) return denied;

    const window = resolveInsightWindow(new URL(request.url).searchParams.get('window'));
    const result = await evaluateAndDispatchInsights({
      trigger: 'cron',
      window,
      locale: 'th',
    });

    return NextResponse.json({
      success: true,
      window,
      dateIso: result.dateIso,
      insightCount: result.insights.length,
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
