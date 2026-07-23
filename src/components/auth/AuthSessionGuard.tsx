'use client';

import { useEffect } from 'react';
import { getAuthSessionInfo } from '@/app/actions/auth';
import { teardownLocalAuthState } from '@/lib/logout-client';

const SESSION_VERIFY_MAX_ATTEMPTS = 2;
const SESSION_VERIFY_RETRY_MS = 750;

async function verifyServerSession(): Promise<boolean> {
  for (let attempt = 0; attempt < SESSION_VERIFY_MAX_ATTEMPTS; attempt += 1) {
    try {
      const info = await getAuthSessionInfo();
      return info.verified;
    } catch (error) {
      console.warn('[AuthSessionGuard] session check failed:', error);
      if (attempt < SESSION_VERIFY_MAX_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, SESSION_VERIFY_RETRY_MS));
      }
    }
  }
  return true;
}

/** Signs out locally when server session is revoked or expired. */
export function AuthSessionGuard() {
  useEffect(() => {
    const tick = async () => {
      const verified = await verifyServerSession();
      if (!verified) {
        await teardownLocalAuthState();
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
