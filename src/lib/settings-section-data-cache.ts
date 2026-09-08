import { fetchDataChangeLogs } from '@/app/actions/data-change-log-actions';
import { fetchLoginHistoryBundle } from '@/app/actions/login-history-actions';
import { getCurrentDevicePasskeyStatus } from '@/app/actions/passkey-actions';

export const EDIT_HISTORY_INITIAL_LIMIT = 50;
export const LOGIN_HISTORY_INITIAL_LIMIT = 20;

const editHistoryPromises = new Map<string, ReturnType<typeof fetchDataChangeLogs>>();
let loginHistoryPromise: ReturnType<typeof fetchLoginHistoryBundle> | null = null;
let passkeyStatusPromise: ReturnType<typeof getCurrentDevicePasskeyStatus> | null = null;

function editHistoryKey(module?: string): string {
  return module ?? 'all';
}

export function getOrFetchEditHistory(options: {
  module?: string;
  limit?: number;
} = {}): ReturnType<typeof fetchDataChangeLogs> {
  const key = editHistoryKey(options.module);
  const cached = editHistoryPromises.get(key);
  if (cached) return cached;

  const promise = fetchDataChangeLogs({
    limit: options.limit ?? EDIT_HISTORY_INITIAL_LIMIT,
    module: options.module,
    forEditHistory: true,
  });
  void promise.catch(() => {
    editHistoryPromises.delete(key);
  });
  editHistoryPromises.set(key, promise);
  return promise;
}

export function prefetchEditHistoryData(module?: string): void {
  if (typeof window === 'undefined') return;
  void getOrFetchEditHistory({ module });
}

export function getOrFetchLoginHistoryBundle(
  limit = LOGIN_HISTORY_INITIAL_LIMIT,
): ReturnType<typeof fetchLoginHistoryBundle> {
  if (!loginHistoryPromise) {
    loginHistoryPromise = fetchLoginHistoryBundle(limit);
    void loginHistoryPromise.catch(() => {
      loginHistoryPromise = null;
    });
  }
  return loginHistoryPromise;
}

export function invalidateLoginHistoryCache(): void {
  loginHistoryPromise = null;
}

export function prefetchLoginHistoryData(): void {
  if (typeof window === 'undefined') return;
  void getOrFetchLoginHistoryBundle();
}

export function getOrFetchPasskeyStatus(): ReturnType<typeof getCurrentDevicePasskeyStatus> {
  if (!passkeyStatusPromise) {
    passkeyStatusPromise = getCurrentDevicePasskeyStatus();
    void passkeyStatusPromise.catch(() => {
      passkeyStatusPromise = null;
    });
  }
  return passkeyStatusPromise;
}

export function invalidatePasskeyStatusCache(): void {
  passkeyStatusPromise = null;
}

export function prefetchPasskeyStatus(): void {
  if (typeof window === 'undefined') return;
  void getOrFetchPasskeyStatus();
}

export function prefetchAllSettingsSectionData(): void {
  prefetchEditHistoryData();
  prefetchLoginHistoryData();
  prefetchPasskeyStatus();
}

export function resetSettingsSectionDataCacheForTests(): void {
  editHistoryPromises.clear();
  loginHistoryPromise = null;
  passkeyStatusPromise = null;
}
