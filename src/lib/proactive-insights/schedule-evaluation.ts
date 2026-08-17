import type { InsightTrigger } from '@/lib/proactive-insights/evaluate-and-dispatch';

const DEBOUNCE_MS = 5 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let pendingTrigger: InsightTrigger = 'manual';

function runInsightEvaluation(trigger: InsightTrigger): void {
  void import('@/lib/proactive-insights/evaluate-and-dispatch')
    .then(({ evaluateAndDispatchInsights }) =>
      evaluateAndDispatchInsights({ trigger, locale: 'th' }),
    )
    .catch((error) => {
      console.error('[proactive-insights] scheduled evaluation failed:', error);
    });
}

/**
 * Debounce cross-module insight evaluation after mutations.
 * Collapses rapid shift/inventory saves into one evaluation.
 */
export function scheduleProactiveInsightEvaluation(trigger: InsightTrigger): void {
  if (trigger === 'bean_order_update') {
    if (timer) clearTimeout(timer);
    timer = null;
    runInsightEvaluation('bean_order_update');
    return;
  }

  pendingTrigger = trigger;
  if (timer) clearTimeout(timer);

  timer = setTimeout(() => {
    timer = null;
    runInsightEvaluation(pendingTrigger);
  }, DEBOUNCE_MS);
}

/** Test-only: clear pending timer state. */
export function __resetInsightScheduleForTests(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  pendingTrigger = 'manual';
}
