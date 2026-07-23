import type { MenuItem } from '@/lib/menu-list';

export const SIDEBAR_MENU_ORDER_KEY = 'sidebar-menu-order';

export function parseSidebarMenuOrder(raw: string | null): string[] | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      'state' in parsed &&
      parsed.state &&
      typeof parsed.state === 'object' &&
      'orderIds' in parsed.state &&
      Array.isArray(parsed.state.orderIds) &&
      parsed.state.orderIds.every((id: unknown) => typeof id === 'string')
    ) {
      return parsed.state.orderIds;
    }
  } catch {
    // ignore malformed data
  }

  return null;
}

export function applySidebarMenuOrder<T extends Pick<MenuItem, 'id'>>(
  menus: T[],
  orderIds: string[] | null,
): T[] {
  if (!orderIds?.length) return menus;

  const reordered = orderIds
    .map((id) => menus.find((menu) => menu.id === id))
    .filter(Boolean) as T[];
  const missing = menus.filter((menu) => !orderIds.includes(menu.id));
  return [...reordered, ...missing];
}
