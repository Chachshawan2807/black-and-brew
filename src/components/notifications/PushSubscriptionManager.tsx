'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { schedulePushSubscriptionMaintenance } from '@/lib/push-subscription-client';

/** Belt-and-suspenders push refresh after PIN auth (main resume logic lives in PwaRegister). */
export function PushSubscriptionManager() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';

  useEffect(() => {
    const schedule = () => schedulePushSubscriptionMaintenance(locale);

    schedule();
    window.addEventListener('bb-pin-authenticated', schedule);
    window.addEventListener('bb-notification-prefs-changed', schedule);

    return () => {
      window.removeEventListener('bb-pin-authenticated', schedule);
      window.removeEventListener('bb-notification-prefs-changed', schedule);
    };
  }, [locale]);

  return null;
}
