/** Offline connectivity + mutation queue UX helpers (pure, testable). */

export const OFFLINE_STATUS_CHANGED_EVENT = 'bb-offline-status-changed';

export type OfflineStatusSnapshot = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
};

export type OfflineBannerVariant = 'offline' | 'syncing' | 'pending' | 'error';

export type OfflineBannerView =
  | { visible: false }
  | {
      visible: true;
      variant: OfflineBannerVariant;
      pendingCount: number;
      message: string;
      actionLabel?: string;
    };

type Locale = 'th' | 'en';

function formatCount(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US').format(n);
}

function pluralChanges(count: number, locale: Locale): string {
  if (locale === 'th') return `${formatCount(count, locale)} รายการ`;
  return count === 1 ? '1 change' : `${formatCount(count, locale)} changes`;
}

export function resolveOfflineBannerView(
  status: OfflineStatusSnapshot,
  locale: Locale,
): OfflineBannerView {
  const { isOnline, pendingCount, isSyncing, lastSyncError } = status;
  const isTh = locale === 'th';
  const retryLabel = isTh ? 'ลองอีกครั้ง' : 'Retry';

  if (!isOnline) {
    const message =
      pendingCount > 0
        ? isTh
          ? `ไม่มีการเชื่อมต่ออินเทอร์เน็ต — รอซิงก์ ${pluralChanges(pendingCount, locale)}`
          : `Offline — ${pluralChanges(pendingCount, locale)} waiting to sync`
        : isTh
          ? 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต — การแก้ไขคลังสินค้าจะถูกเก็บไว้และซิงก์เมื่อกลับออนไลน์'
          : 'No internet connection — inventory edits are saved and will sync when you are back online';

    return {
      visible: true,
      variant: 'offline',
      pendingCount,
      message,
    };
  }

  if (pendingCount > 0 && isSyncing) {
    return {
      visible: true,
      variant: 'syncing',
      pendingCount,
      message: isTh
        ? `กำลังซิงก์ ${pluralChanges(pendingCount, locale)}...`
        : `Syncing ${pluralChanges(pendingCount, locale)}...`,
    };
  }

  if (pendingCount > 0 && lastSyncError) {
    return {
      visible: true,
      variant: 'error',
      pendingCount,
      message: isTh
        ? `ซิงก์ไม่สำเร็จ — รออยู่ ${pluralChanges(pendingCount, locale)}`
        : `Sync failed — ${pluralChanges(pendingCount, locale)} remaining`,
      actionLabel: retryLabel,
    };
  }

  if (pendingCount > 0) {
    return {
      visible: true,
      variant: 'pending',
      pendingCount,
      message: isTh
        ? `รอซิงก์ ${pluralChanges(pendingCount, locale)} — แตะเพื่อลองอีกครั้ง`
        : `${pluralChanges(pendingCount, locale)} waiting — tap to retry`,
      actionLabel: retryLabel,
    };
  }

  return { visible: false };
}

export function isOfflineStatusEvent(
  event: Event,
): event is CustomEvent<OfflineStatusSnapshot> {
  return event.type === OFFLINE_STATUS_CHANGED_EVENT;
}
