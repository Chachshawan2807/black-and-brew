'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';

/**
 * Loads the notification hub in a separate chunk after first paint.
 * Children render immediately so route content is not blocked on hub compile.
 */
export function LazyNotificationProvider({ children }: { children: ReactNode }) {
  const [Provider, setProvider] = useState<ComponentType<{ children: ReactNode }> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    void import('@/components/notifications/NotificationProvider').then((mod) => {
      if (!cancelled) {
        setProvider(() => mod.NotificationProvider);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!Provider) return children;
  return <Provider>{children}</Provider>;
}
