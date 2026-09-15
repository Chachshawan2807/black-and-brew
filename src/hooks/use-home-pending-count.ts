'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { countPendingSecretaryTasks } from '@/app/actions/home-actions';
import { subscribeHomeSidebarPendingCount } from '@/hooks/use-home-board-sync';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';

export function useHomePendingCount(): number {
  const [count, setCount] = useState(0);
  const refreshSeqRef = useRef(0);

  const refreshFromServer = useCallback(() => {
    const iso = todayIsoBkk();
    const seq = ++refreshSeqRef.current;
    void countPendingSecretaryTasks(iso).then((value) => {
      if (seq === refreshSeqRef.current) {
        setCount(value);
      }
    });
  }, []);

  useEffect(() => {
    refreshFromServer();
    const unsubscribe = subscribeHomeSidebarPendingCount(setCount);
    const interval = window.setInterval(refreshFromServer, 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [refreshFromServer]);

  return count;
}
