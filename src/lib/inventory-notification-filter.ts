/** Skip in-app notifications for changes that should not alert inventory users. */
export function isSuppressedInventoryNotification(
  metadata?: Record<string, unknown>
): boolean {
  if (!metadata) return false;
  if (metadata.suppressNotification === true) return true;
  if (metadata.notificationContext === 'inventory_count') return true;
  return false;
}
