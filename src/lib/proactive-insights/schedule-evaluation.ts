import type { InsightTrigger } from '@/lib/proactive-insights/evaluate-and-dispatch';

const DEBOUNCE_MS = 5 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let pendingTrigger: InsightTrigger = 'manual';

/**
 * Debounce cross-module insight evaluation after mutations.
 * Collapses rapid shift/inventory saves into one evaluation.
 */
export function scheduleProactiveInsightEvaluation(trigger: InsightTrigger): void {
  pendingTrigger = trigger;
  if (timer) clearTimeout(timer);

  timer = setTimeout(() => {
    timer = null;
    const activeTrigger = pendingTrigger;
    void import('@/lib/proactive-insights/evaluate-and-dispatch')
      .then(({ evaluateAndDispatchInsights }) =>
        evaluateAndDispatchInsights({ trigger: activeTrigger, locale: 'th' }),
      )
      .catch((error) => {
        console.error('[proactive-insights] scheduled evaluation failed:', error);
      });
  }, DEBOUNCE_MS);
}

/** Test-only: clear pending timer state. */
export function __resetInsightScheduleForTests(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  pendingTrigger = 'manual';
}
