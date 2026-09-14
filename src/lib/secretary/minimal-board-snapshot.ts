import type { SecretarySnapshot } from '@/lib/secretary/types';
import { EMPTY_SECRETARY_COUNT_SESSION } from '@/lib/secretary/types';

/** Lightweight snapshot for the manual-only secretary board (no module derive). */
export function buildMinimalSecretaryBoardSnapshot(
  dateIso: string,
  locale: string,
): SecretarySnapshot {
  return {
    dateIso,
    locale,
    headcountToday: 0,
    isBranch2Day: false,
    itemsToOrder: [],
    branchWithdrawItems: [],
    inventoryCatalogItems: [],
    maintenanceTasks: [],
    countSession: EMPTY_SECRETARY_COUNT_SESSION,
    operational: {
      dateIso,
      dateDisplay: dateIso,
      locale,
      headcount: 0,
      leaveCount: 0,
      offCount: 0,
      weeklyDays: [],
      pendingBeanOrders: [],
      upcomingHoliday: null,
    },
  };
}
