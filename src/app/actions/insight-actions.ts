'use server';

import { requireReadAccess } from '@/lib/policies/server-gate';
import { evaluateAndDispatchInsights } from '@/lib/proactive-insights/evaluate-and-dispatch';

/** Recompute today's proactive insight digest from live ERP data (no Web Push). */
export async function refreshProactiveInsightDigest(
  locale = 'th',
): Promise<{ success: boolean; error?: string }> {
  const denied = await requireReadAccess();
  if (denied) return { success: false, error: denied };

  try {
    await evaluateAndDispatchInsights({
      trigger: 'bean_order_update',
      locale,
      skipPush: true,
    });
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'รีเฟรชการแจ้งเตือนไม่สำเร็จ';
    console.error('[refreshProactiveInsightDigest] Exception:', error);
    return { success: false, error: message };
  }
}
