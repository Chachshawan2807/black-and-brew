/** Maps Web Push / DOM failures to stable Settings error codes. */

export function classifyPushRegistrationError(error: unknown): string {
  if (!error) return 'ensure_failed';

  const name =
    error instanceof DOMException
      ? error.name
      : typeof error === 'object' && error !== null && 'name' in error
        ? String((error as { name?: unknown }).name)
        : '';
  const message = error instanceof Error ? error.message : String(error);
  const combined = `${name} ${message}`.toLowerCase();

  if (name === 'NotAllowedError' || /not allowed|user denied/i.test(message)) {
    return 'gesture_required';
  }
  if (name === 'InvalidStateError' || /already subscribed|in progress/i.test(message)) {
    return 'subscribe_in_progress';
  }
  if (/applicationServerKey|vapid|overload resolution|cannot be converted|buffer source/i.test(message)) {
    return 'vapid_key_invalid';
  }
  if (name === 'AbortError') return 'push_unavailable';
  if (/push service not available/i.test(combined)) return 'push_unavailable';
  if (/registration failed/i.test(message)) return 'push_unavailable';
  if (/service_worker/i.test(combined)) return 'push_unavailable';
  if (
    /failed to find server action|failed to fetch|load failed|networkerror|fetch failed/i.test(
      combined,
    )
  ) {
    return 'server_unreachable';
  }

  return 'ensure_failed';
}

const RETRYABLE_REGISTER_ERRORS = new Set([
  'supabase_session_missing',
  'pin_session_required',
  'server_unreachable',
  'server_exception',
  'subscribe_in_progress',
]);

export function isRetryablePushRegisterError(error: string | null | undefined): boolean {
  if (!error) return false;
  return RETRYABLE_REGISTER_ERRORS.has(error);
}

export type PushVerifyStatus = 'registered' | 'missing' | 'unauthorized' | 'error';

/**
 * Do not unsubscribe a working Chrome/FCM endpoint just because the server row is
 * missing. Expired JWT / stale Server Actions used to drop the local sub, then
 * subscribe() failed and Settings showed none + ensure_failed.
 */
export function shouldReplaceLocalPushSubscription(_status: PushVerifyStatus): boolean {
  return false;
}
