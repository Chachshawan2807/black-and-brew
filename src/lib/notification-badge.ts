/** In-app notification badge (FAB / sidebar) — full counts like LINE; OS launcher stays capped separately. */

export const IN_APP_BADGE_OVERFLOW = 9999;

export function formatInAppBadgeLabel(count: number): string {
  const safe = Math.max(0, Math.floor(Number(count) || 0));
  if (safe <= 0) return '';
  if (safe > IN_APP_BADGE_OVERFLOW) return `${IN_APP_BADGE_OVERFLOW}+`;
  return String(safe);
}

export function getInAppBadgeClassName(count: number): string {
  const safe = Math.max(0, Math.floor(Number(count) || 0));
  if (safe > 999) return 'h-[18px] min-w-[28px] px-1 text-[8px] leading-none';
  if (safe > 99) return 'h-[18px] min-w-[24px] px-1 text-[9px] leading-none';
  if (safe > 9) return 'h-[18px] min-w-[20px] px-1 text-[9px] leading-none';
  return 'h-[18px] min-w-[18px] px-1 text-[10px] leading-none';
}
