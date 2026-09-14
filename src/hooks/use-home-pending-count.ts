'use client';

import { useCallback, useEffect, useState } from 'react';
import { countPendingSecretaryTasks } from '@/app/actions/home-actions';
import { subscribeHomeBoardInvalidation } from '@/hooks/use-home-board-sync';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';

export function useHomePendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    const iso = todayIsoBkk();
    void countPendingSecretaryTasks(iso).then((value) => {
      setCount(value);
    });
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeHomeBoardInvalidation(refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [refresh]);

  return count;
}
