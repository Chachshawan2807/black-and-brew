'use client';

import { useEffect, useState } from 'react';
import { useMobileNavDrawer } from '@/hooks/use-mobile-nav-drawer';

const MOBILE_NAV_MQ = '(max-width: 767px)';

/**
 * True when the mobile nav drawer is open and should inert the main landmark.
 */
export function useMobileNavDrawerInert(): boolean {
  const drawerOpen = useMobileNavDrawer((s) => s.isOpen);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobile && drawerOpen;
}
