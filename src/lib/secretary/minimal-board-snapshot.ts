import type { SecretarySnapshot } from '@/lib/secretary/types';
import { EMPTY_SECRETARY_COUNT_SESSION } from '@/lib/secretary/types';

/** Lightweight snapshot for fast home SSR; full data arrives via background board sync. */
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

/** True when the board still has placeholder snapshot data from deferDerivedSync / cache. */
export function isMinimalSecretaryBoardSnapshot(snapshot: SecretarySnapshot): boolean {
  return (
    snapshot.itemsToOrder.length === 0 &&
    snapshot.branchWithdrawItems.length === 0 &&
    snapshot.inventoryCatalogItems.length === 0 &&
    snapshot.maintenanceTasks.length === 0 &&
    snapshot.operational.pendingBeanOrders.length === 0 &&
    snapshot.operational.weeklyDays.length === 0 &&
    snapshot.headcountToday === 0
  );
}
