import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { AppShell } from '@/components/shell/AppShell';

/** Server shell entry. Reads the PIN cookie so authed HTML is not wiped until JS hydrates. */
export async function AppShellLoader({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const ssrVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';
  return <AppShell ssrVerified={ssrVerified}>{children}</AppShell>;
}
