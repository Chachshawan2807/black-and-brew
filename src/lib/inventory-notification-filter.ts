/** Skip in-app notifications only when explicitly suppressed (rare server-side opt-out). */
export function isSuppressedInventoryNotification(
  metadata?: Record<string, unknown>
): boolean {
  if (!metadata) return false;
  return metadata.suppressNotification === true;
}
