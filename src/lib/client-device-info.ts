'use client';

import { parseUserAgent } from '@/lib/parse-user-agent';
import type { ClientDevicePayload } from '@/lib/login-history-types';

export type { ClientDevicePayload };

export function collectClientDeviceInfo(): ClientDevicePayload {
  const ua = navigator.userAgent;
  const parsed = parseUserAgent(ua);

  return {
    userAgent: ua,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sessionFingerprint: [
      ua.slice(0, 120),
      window.screen.width,
      window.screen.height,
      navigator.language,
      parsed.deviceModel ?? 'unknown',
    ].join('|'),
  };
}
