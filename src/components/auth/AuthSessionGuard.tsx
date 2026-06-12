'use client';

import { useEffect } from 'react';
import { getAuthSessionInfo } from '@/app/actions/auth';
import { clearClientAuthSession } from '@/lib/client-auth-storage';
import { clearSupabaseSession } from '@/lib/supabase-session';

/** Signs out locally when server session is revoked or expired. */
export function AuthSessionGuard() {
  useEffect(() => {
    const tick = async () => {
      const info = await getAuthSessionInfo();
      if (!info.verified) {
        clearClientAuthSession();
        await clearSupabaseSession();
        window.location.reload();
      }
    };

    const interval = window.setInterval(() => {
      void tick();
    }, 30_000);

    const onFocus = () => {
      void tick();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return null;
}
