/**
 * Warm settings lazy section chunks and data during idle time or hover intent.
 */
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import {
  prefetchEditHistoryData,
  prefetchLoginHistoryData,
  prefetchPasskeyStatus,
  prefetchAllSettingsSectionData,
} from '@/lib/settings-section-data-cache';

const preloaded = new Set<string>();

const SECTION_LOADERS: Record<string, () => Promise<unknown>> = {
  pageSections: () =>
    import('@/app/[locale]/settings/_components/SettingsPageSections'),
  notifications: () =>
    import('@/app/[locale]/settings/_components/NotificationPreferencesSection'),
  dataHistory: () =>
    import('@/app/[locale]/settings/_components/DataChangeHistorySection'),
  loginHistory: () =>
    import('@/app/[locale]/settings/_components/LoginHistorySection'),
  passkey: () => import('@/app/[locale]/settings/_components/PasskeyDeviceSection'),
};

const SECTION_DATA_PREFETCH: Partial<Record<keyof typeof SECTION_LOADERS, () => void>> = {
  dataHistory: prefetchEditHistoryData,
  loginHistory: prefetchLoginHistoryData,
  passkey: prefetchPasskeyStatus,
};

export function preloadSettingsSection(key: keyof typeof SECTION_LOADERS): void {
  if (typeof window === 'undefined' || preloaded.has(key)) return;
  preloaded.add(key);
  void SECTION_LOADERS[key]();
  SECTION_DATA_PREFETCH[key]?.();
}

export function preloadSettingsSectionsOnIdle(): void {
  if (typeof window === 'undefined') return;

  const run = () => {
    for (const key of ['dataHistory', 'loginHistory', 'passkey'] as const) {
      preloadSettingsSection(key);
    }
    prefetchAllSettingsSectionData();
  };

  scheduleIdleWork(run, { timeout: 2000 });
}

export function resetSettingsChunkPreloadForTests(): void {
  preloaded.clear();
}
