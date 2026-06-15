import { SlidingWindowRateLimiter } from '@/lib/rate-limit/sliding-window';

/** Match client-side lockout: 5 failures / 15 minutes per IP. */
const PIN_MAX_FAILURES = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000;

const pinFailureLimiter = new SlidingWindowRateLimiter(PIN_MAX_FAILURES, PIN_LOCKOUT_MS);

export const PIN_LOCKOUT_MSG =
  'ลองใส่ PIN ผิดเกิน 5 ครั้ง กรุณารอ 15 นาทีแล้วลองใหม่';

export function formatPinLockoutMessage(resetAt: number): string {
  const minutesLeft = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
  return `${PIN_LOCKOUT_MSG} (เหลือประมาณ ${minutesLeft} นาที)`;
}

export function getPinLockoutStatus(clientIp: string): {
  allowed: boolean;
  resetAt: number;
} {
  const result = pinFailureLimiter.peek(`pin:${clientIp}`);
  return { allowed: result.allowed, resetAt: result.resetAt };
}

/** Record one failed PIN attempt; returns lockout state after recording. */
export function recordPinFailure(clientIp: string): {
  allowed: boolean;
  resetAt: number;
} {
  const result = pinFailureLimiter.check(`pin:${clientIp}`);
  return { allowed: result.allowed, resetAt: result.resetAt };
}

export function clearPinAttempts(clientIp: string): void {
  pinFailureLimiter.clear(`pin:${clientIp}`);
}
