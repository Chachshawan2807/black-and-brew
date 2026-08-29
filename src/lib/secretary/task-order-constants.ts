/** Minimum actionable tasks before calling AI task-order API. */
export const MIN_TASKS_FOR_AI_ORDER = 2;

export const SECRETARY_TASK_ORDER_DEBOUNCE_MS = 900;
export const SECRETARY_TASK_ORDER_STABILITY_MS = 2000;

export type SecretaryTaskOrderSource = 'ai' | 'fallback' | 'cache';
