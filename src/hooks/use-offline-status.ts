'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FLUSH_OFFLINE_MUTATIONS_EVENT,
  getOfflineStatusSnapshot,
  OFFLINE_STATUS_CHANGED_EVENT,
} from '@/lib/offline-mutation-client';
import {
  isOfflineStatusEvent,
  type OfflineStatusSnapshot,
} from '@/lib/offline-status';

const EMPTY_SNAPSHOT: OfflineStatusSnapshot = {
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncError: null,
};

export function useOfflineStatus(): OfflineStatusSnapshot {
  const [status, setStatus] = useState<OfflineStatusSnapshot>(EMPTY_SNAPSHOT);

  const refresh = useCallback(async () => {
    const snapshot = await getOfflineStatusSnapshot();
    setStatus(snapshot);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });

    const onStatusChanged = (event: Event) => {
      if (!isOfflineStatusEvent(event)) return;
      setStatus(event.detail);
    };

    window.addEventListener(OFFLINE_STATUS_CHANGED_EVENT, onStatusChanged);
    return () => {
      window.removeEventListener(OFFLINE_STATUS_CHANGED_EVENT, onStatusChanged);
    };
  }, [refresh]);

  return status;
}

export function requestOfflineSyncRetry(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FLUSH_OFFLINE_MUTATIONS_EVENT));
}
