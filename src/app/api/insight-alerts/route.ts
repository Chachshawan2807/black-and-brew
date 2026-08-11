import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { headers } from 'next/headers';
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

    const force = new URL(request.url).searchParams.get('force') === '1';

    const result = await evaluateAndDispatchInsights({
      trigger: 'cron',
      locale: 'th',
      force,
    });

    const digestSent = Boolean(
      result.digest && result.pushed && !result.pushed.skipped && result.pushed.sent > 0,
    );

    return NextResponse.json({
      success: true,
      dateIso: result.dateIso,
      matchedRuleCount: result.matchedRules.length,
      matchedRules: result.matchedRules.map((insight) => insight.ruleId),
      digestSent,
      digestSkippedReason:
        result.recorded?.skipped && !force
          ? 'morning_push_already_dispatched'
          : result.pushed?.skipped && result.recorded && !result.recorded.skipped
            ? 'push_skipped'
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
