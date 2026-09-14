'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-fetch RSC home data after client PIN auth when the server still shows the auth placeholder. */
export function HomeAuthRefresh() {
  const router = useRouter();

  useEffect(() => {
    const onAuthenticated = () => {
      router.refresh();
    };
    window.addEventListener('bb-pin-authenticated', onAuthenticated);
    return () => window.removeEventListener('bb-pin-authenticated', onAuthenticated);
  }, [router]);

  return null;
}
