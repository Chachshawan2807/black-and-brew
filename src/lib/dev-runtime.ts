/** Production notification catch-up row limit (unchanged for staff devices). */
export const NOTIFICATION_CATCH_UP_LIMIT_PRODUCTION = 150;

/** Smaller dev catch-up keeps local HMR refreshes responsive. */
export const NOTIFICATION_CATCH_UP_LIMIT_DEVELOPMENT = 30;

export function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function shouldSkipSecretaryAiSync(skipAiSync?: boolean): boolean {
  if (skipAiSync === true) return true;
  if (skipAiSync === false) return false;
  return isDevelopmentRuntime();
}

export function getNotificationCatchUpLimit(): number {
  return isDevelopmentRuntime()
    ? NOTIFICATION_CATCH_UP_LIMIT_DEVELOPMENT
    : NOTIFICATION_CATCH_UP_LIMIT_PRODUCTION;
}
