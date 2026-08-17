import type { InsightTrigger } from '@/lib/proactive-insights/evaluate-and-dispatch';

let queuedTrigger: InsightTrigger | null = null;
let flushScheduled = false;

function runInsightEvaluation(trigger: InsightTrigger): void {
  void import('@/lib/proactive-insights/evaluate-and-dispatch')
    .then(({ evaluateAndDispatchInsights }) =>
      evaluateAndDispatchInsights({ trigger, locale: 'th' }),
    )
    .catch((error) => {
      console.error('[proactive-insights] scheduled evaluation failed:', error);
    });
}

/** Run cross-module insight evaluation immediately after mutations. */
export function scheduleProactiveInsightEvaluation(trigger: InsightTrigger): void {
  queuedTrigger = trigger;
  if (flushScheduled) return;

  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    const nextTrigger = queuedTrigger ?? 'manual';
    queuedTrigger = null;
    runInsightEvaluation(nextTrigger);
  });
}

/** Test-only: clear pending timer state. */
export function __resetInsightScheduleForTests(): void {
  queuedTrigger = null;
  flushScheduled = false;
}
