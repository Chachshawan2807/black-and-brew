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
  if (/applicationServerKey|vapid/i.test(message)) {
    return 'vapid_key_invalid';
  }
  if (name === 'AbortError') return 'push_unavailable';
  if (/push service not available/i.test(combined)) return 'push_unavailable';
  if (/registration failed/i.test(message)) return 'push_unavailable';
  if (/service_worker/i.test(combined)) return 'push_unavailable';

  return 'ensure_failed';
}

export type PushVerifyStatus = 'registered' | 'missing' | 'unauthorized' | 'error';

/** Only drop a local PushSubscription when the server confirmed the endpoint is gone (FCM 410). */
export function shouldReplaceLocalPushSubscription(status: PushVerifyStatus): boolean {
  return status === 'missing';
}
