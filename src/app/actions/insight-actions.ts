'use server';

import { requireReadAccess } from '@/lib/policies/server-gate';

/** Panel catch-up reads cron-written insight logs only — no realtime re-evaluation. */
export async function refreshProactiveInsightDigest(
  _locale = 'th',
): Promise<{ success: boolean; error?: string }> {
  const denied = await requireReadAccess();
  if (denied) return { success: false, error: denied };

  return { success: true };
}
