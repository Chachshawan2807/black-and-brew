export const REALTIME_RESUME_RECONNECT_HIDDEN_MS = 2_000;

export function shouldReconnectRealtimeOnResume(
  hiddenMs: number,
  isConnected: boolean,
  isConnecting: boolean,
): boolean {
  if (isConnecting) return false;
  if (!isConnected) return true;
  return hiddenMs >= REALTIME_RESUME_RECONNECT_HIDDEN_MS;
}
