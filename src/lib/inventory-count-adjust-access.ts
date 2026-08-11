export const COUNT_ADJUST_UNLOCK_KEY = 'bb_inventory_count_adjust_unlocked';

export function isCountAdjustUnlocked(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(COUNT_ADJUST_UNLOCK_KEY) === '1';
}

export function setCountAdjustUnlocked(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(COUNT_ADJUST_UNLOCK_KEY, '1');
}

export function clearCountAdjustUnlocked(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(COUNT_ADJUST_UNLOCK_KEY);
}
