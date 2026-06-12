import type { LoginHistoryRow } from '@/app/actions/login-history-actions';

export interface ActiveLoginSession {
  sessionFingerprint: string;
  lastLoginAt: string;
  accessLevel: 'full' | 'read_only' | null;
  deviceType: string;
  deviceVendor: string | null;
  deviceModel: string | null;
  osName: string | null;
  osVersion: string | null;
  browserName: string | null;
  ipAddress: string | null;
  isCurrentDevice: boolean;
}

/** Latest event per fingerprint — active when last event is login_success. */
export function computeActiveLoginSessions(
  rows: LoginHistoryRow[],
  currentFingerprint?: string | null
): ActiveLoginSession[] {
  const latestByFingerprint = new Map<string, LoginHistoryRow>();

  for (const row of rows) {
    const fp = row.session_fingerprint;
    if (!fp || latestByFingerprint.has(fp)) continue;
    latestByFingerprint.set(fp, row);
  }

  const active: ActiveLoginSession[] = [];

  for (const [fp, row] of latestByFingerprint) {
    if (row.event_type !== 'login_success') continue;

    active.push({
      sessionFingerprint: fp,
      lastLoginAt: row.occurred_at,
      accessLevel: row.access_level,
      deviceType: row.device_type,
      deviceVendor: row.device_vendor,
      deviceModel: row.device_model,
      osName: row.os_name,
      osVersion: row.os_version,
      browserName: row.browser_name,
      ipAddress: row.ip_address,
      isCurrentDevice: Boolean(currentFingerprint && fp === currentFingerprint),
    });
  }

  return active.sort((a, b) => b.lastLoginAt.localeCompare(a.lastLoginAt));
}
