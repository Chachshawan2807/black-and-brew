'use server';

import { z } from 'zod';
import { pushLineMessage } from '@/lib/line-notify';
import { ensureServerSession } from '@/lib/security/server-auth';

const lineNotificationSchema = z.object({
  targetId: z.string().min(1).max(64),
  message: z.string().min(1).max(5000),
});

/**
 * Sends a push notification to a LINE target ID (User ID, Group ID, or Room ID).
 * Requires PIN or Supabase session — cron jobs use pushLineMessage directly.
 */
export async function sendLineNotification(targetId: string, message: string) {
  const auth = await ensureServerSession();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const parsed = lineNotificationSchema.safeParse({ targetId, message });
  if (!parsed.success) {
    return { success: false, error: 'Invalid LINE notification payload' };
  }

  return pushLineMessage(parsed.data.targetId, parsed.data.message);
}
