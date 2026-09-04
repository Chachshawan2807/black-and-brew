import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string compare for PIN, bearer secrets, and other credentials.
 * Different lengths still return false without throwing.
 */
export function timingSafeEqualText(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);

  if (leftBuf.length !== rightBuf.length) {
    timingSafeEqual(leftBuf, leftBuf);
    return false;
  }

  try {
    return timingSafeEqual(leftBuf, rightBuf);
  } catch {
    return false;
  }
}
