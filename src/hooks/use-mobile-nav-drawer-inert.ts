'use client';

import { useEffect, useState } from 'react';

const MOBILE_NAV_MQ = '(max-width: 767px)';

/**
 * True when the mobile nav drawer is open and should inert the main landmark
 * (Baseline Widely available — pairs with navigation-drawer a11y guidance).
 */
export function useMobileNavDrawerInert(sidebarOpen: boolean): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobile && sidebarOpen;
}
