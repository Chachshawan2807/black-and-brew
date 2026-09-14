'use client';

import { useCallback, useEffect, useState } from 'react';
import { countPendingSecretaryTasks } from '@/app/actions/secretary-actions';
import { subscribeSecretaryInvalidation } from '@/hooks/use-secretary-board-sync';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';

export function useSecretaryPendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    const iso = todayIsoBkk();
    void countPendingSecretaryTasks(iso).then((value) => {
      setCount(value);
    });
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeSecretaryInvalidation(refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [refresh]);

  return count;
}
