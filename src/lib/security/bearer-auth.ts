import { timingSafeEqualText } from '@/lib/security/timing-safe';

/**
 * Constant-time comparison for webhook/cron bearer secrets.
 * Prevents timing side-channels when validating Authorization headers.
 */
export function verifyBearerSecret(
  authHeader: string | null,
  secret: string | undefined | null,
): boolean {
  if (!authHeader || !secret) return false;

  return timingSafeEqualText(authHeader.trim(), `Bearer ${secret}`);
}
