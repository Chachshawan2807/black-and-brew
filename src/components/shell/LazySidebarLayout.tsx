'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';

/**
 * Loads sidebar chrome in a separate chunk. Route content renders in a minimal main
 * landmark until the full sidebar shell is ready.
 */
export function LazySidebarLayout({ children }: { children: ReactNode }) {
  const [Layout, setLayout] = useState<ComponentType<{ children: ReactNode }> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    void import('@/components/sidebar/SidebarLayout').then((mod) => {
      if (!cancelled) {
        setLayout(() => mod.default);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!Layout) {
    return (
      <main id="app-main" className="bb-main-container flex-1 min-h-0 bg-transparent">
        {children}
      </main>
    );
  }

  return <Layout>{children}</Layout>;
}
