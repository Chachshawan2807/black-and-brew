/**
 * Warm settings lazy section chunks during idle time or hover intent.
 */
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

export function preloadSettingsSection(key: keyof typeof SECTION_LOADERS): void {
  if (typeof window === 'undefined' || preloaded.has(key)) return;
  preloaded.add(key);
  void SECTION_LOADERS[key]();
}

export function preloadSettingsSectionsOnIdle(): void {
  if (typeof window === 'undefined') return;

  const run = () => {
    for (const key of ['dataHistory', 'loginHistory', 'passkey'] as const) {
      preloadSettingsSection(key);
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 5000 });
    return;
  }

  window.setTimeout(run, 2000);
}

export function resetSettingsChunkPreloadForTests(): void {
  preloaded.clear();
}
