import { beforeEach, describe, expect, test, vi } from 'vitest';

const fetchDataChangeLogs = vi.fn();
const fetchLoginHistoryBundle = vi.fn();
const getCurrentDevicePasskeyStatus = vi.fn();

vi.mock('@/app/actions/data-change-log-actions', () => ({
  fetchDataChangeLogs,
}));

vi.mock('@/app/actions/login-history-actions', () => ({
  fetchLoginHistoryBundle,
}));

vi.mock('@/app/actions/passkey-actions', () => ({
  getCurrentDevicePasskeyStatus,
}));

describe('settings-section-data-cache', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/lib/settings-section-data-cache');
    mod.resetSettingsSectionDataCacheForTests();
  });

  test('deduplicates edit history fetches per module filter', async () => {
    fetchDataChangeLogs.mockResolvedValue({ success: true, rows: [] });

    const mod = await import('@/lib/settings-section-data-cache');
    await mod.getOrFetchEditHistory();
    await mod.getOrFetchEditHistory();

    expect(fetchDataChangeLogs).toHaveBeenCalledTimes(1);
    expect(fetchDataChangeLogs).toHaveBeenCalledWith({
      limit: mod.EDIT_HISTORY_INITIAL_LIMIT,
      module: undefined,
      forEditHistory: true,
    });
  });

  test('uses separate cache entries per module filter', async () => {
    fetchDataChangeLogs.mockResolvedValue({ success: true, rows: [] });

    const mod = await import('@/lib/settings-section-data-cache');
    await mod.getOrFetchEditHistory({ module: 'inventory' });
    await mod.getOrFetchEditHistory({ module: 'schedule' });

    expect(fetchDataChangeLogs).toHaveBeenCalledTimes(2);
  });

  test('deduplicates login history bundle fetches', async () => {
    fetchLoginHistoryBundle.mockResolvedValue({
      success: true,
      rows: [],
      sessions: [],
    });

    const mod = await import('@/lib/settings-section-data-cache');
    await mod.getOrFetchLoginHistoryBundle();
    await mod.getOrFetchLoginHistoryBundle();

    expect(fetchLoginHistoryBundle).toHaveBeenCalledTimes(1);
    expect(fetchLoginHistoryBundle).toHaveBeenCalledWith(mod.LOGIN_HISTORY_INITIAL_LIMIT);
  });

  test('invalidates login history cache on demand', async () => {
    fetchLoginHistoryBundle.mockResolvedValue({
      success: true,
      rows: [],
      sessions: [],
    });

    const mod = await import('@/lib/settings-section-data-cache');
    await mod.getOrFetchLoginHistoryBundle();
    mod.invalidateLoginHistoryCache();
    await mod.getOrFetchLoginHistoryBundle();

    expect(fetchLoginHistoryBundle).toHaveBeenCalledTimes(2);
  });

  test('deduplicates passkey status fetches', async () => {
    getCurrentDevicePasskeyStatus.mockResolvedValue({
      enrolled: false,
      deviceLabel: null,
    });

    const mod = await import('@/lib/settings-section-data-cache');
    await mod.getOrFetchPasskeyStatus();
    await mod.getOrFetchPasskeyStatus();

    expect(getCurrentDevicePasskeyStatus).toHaveBeenCalledTimes(1);
  });

  test('invalidates passkey status cache on demand', async () => {
    getCurrentDevicePasskeyStatus.mockResolvedValue({
      enrolled: true,
      deviceLabel: 'iPhone',
    });

    const mod = await import('@/lib/settings-section-data-cache');
    await mod.getOrFetchPasskeyStatus();
    mod.invalidatePasskeyStatusCache();
    await mod.getOrFetchPasskeyStatus();

    expect(getCurrentDevicePasskeyStatus).toHaveBeenCalledTimes(2);
  });
});
