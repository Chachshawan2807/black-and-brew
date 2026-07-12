/** Classify offline inventory replay failures as retryable or permanent. */

import { READ_ONLY_DENY_MSG } from '@/lib/auth-constants';
import { UNAUTHORIZED_MSG } from '@/lib/policies/messages';

const NETWORK_ERROR_RE =
  /failed to fetch|networkerror|network error|load failed|offline|timeout|ecconn|enotfound|econnrefused|offline replay failed:\s*503/i;

const NON_RETRYABLE_ERROR_RES = [
  new RegExp(UNAUTHORIZED_MSG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  new RegExp(READ_ONLY_DENY_MSG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
  /invalid.*payload/i,
];

/** Permanent auth/validation failures should drop queued mutations instead of retrying forever. */
export function isOfflineReplayFailureRetryable(error: string): boolean {
  const message = error.trim();
  if (!message) return false;

  if (NON_RETRYABLE_ERROR_RES.some((pattern) => pattern.test(message))) {
    return false;
  }

  return NETWORK_ERROR_RE.test(message);
}
