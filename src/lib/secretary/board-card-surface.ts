import { cn } from '@/lib/utils';
import { SECRETARY_MODULE_CARD_COLORS } from '@/lib/shift-colors';
import type { SecretaryModule } from '@/lib/secretary/types';

/** Short module tag on home board cards (not filter chip labels). */
export const SECRETARY_MODULE_BOARD_TAGS: Record<SecretaryModule, string> = {
  schedule: 'ตาราง',
  dashboard: 'ภาพรวม',
  inventory: 'คลัง',
  inventory_count: 'ตรวจนับ',
  inventory_accuracy: 'ความแม่นยำ',
  branch_withdraw: 'เบิก ส.2',
  bean_orders: 'เมล็ด',
  maintenance: 'ซ่อม',
  branch2: 'สาขา 2',
  custom: 'งานเอง',
};

export function resolveSecretaryBoardCardClass(module: SecretaryModule): string {
  return cn(SECRETARY_MODULE_CARD_COLORS[module], 'border-black/20');
}

export function formatSecretaryWorkDateLabel(dateIso: string): string {
  const parts = dateIso.split('-').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return dateIso;
  }

  const [year, month, day] = parts;
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(anchor);
}
