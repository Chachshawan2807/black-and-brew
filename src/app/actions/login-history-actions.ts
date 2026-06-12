'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { parseUserAgent } from '@/lib/parse-user-agent';
import type { ClientDevicePayload } from '@/lib/login-history-types';
import { SESSION_FP_COOKIE } from '@/lib/auth-constants';
import { computeActiveLoginSessions, type ActiveLoginSession } from '@/lib/login-session-status';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type LoginEventType = 'login_success' | 'login_failure' | 'logout' | 'lockout';
export type LoginAccessLevel = 'full' | 'read_only';
export type LoginEventStatus = 'success' | 'failure' | 'blocked';

export interface LoginHistoryRow {
  id: string;
  event_type: LoginEventType;
  occurred_at: string;
  ip_address: string | null;
  device_type: string;
  device_vendor: string | null;
  device_model: string | null;
  os_name: string | null;
  os_version: string | null;
  browser_name: string | null;
  browser_version: string | null;
  access_level: LoginAccessLevel | null;
  status: LoginEventStatus;
  failure_reason: string | null;
  session_fingerprint: string | null;
  metadata: Record<string, unknown>;
}

interface RecordLoginEventInput {
  eventType: LoginEventType;
  status: LoginEventStatus;
  device?: ClientDevicePayload | null;
  accessLevel?: LoginAccessLevel | null;
  failureReason?: string | null;
}

async function ensureAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('bb_auth_pin_verified')?.value === 'true';
}

async function resolveClientIp(): Promise<string | null> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  return headerStore.get('x-real-ip') ?? headerStore.get('cf-connecting-ip') ?? null;
}

function buildDeviceFields(device?: ClientDevicePayload | null) {
  if (!device) {
    return {
      user_agent: null,
      device_type: 'unknown' as const,
      device_vendor: null,
      device_model: null,
      os_name: null,
      os_version: null,
      browser_name: null,
      browser_version: null,
      session_fingerprint: null,
      metadata: {},
    };
  }

  const parsed = parseUserAgent(device.userAgent);

  return {
    user_agent: device.userAgent,
    device_type: parsed.deviceType,
    device_vendor: parsed.deviceVendor,
    device_model: parsed.deviceModel,
    os_name: parsed.osName,
    os_version: parsed.osVersion,
    browser_name: parsed.browserName,
    browser_version: parsed.browserVersion,
    session_fingerprint: device.sessionFingerprint,
    metadata: {
      screen_width: device.screenWidth,
      screen_height: device.screenHeight,
      language: device.language,
      timezone: device.timezone,
    },
  };
}

export async function recordLoginEvent(input: RecordLoginEventInput): Promise<void> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAdminKey);
    const deviceFields = buildDeviceFields(input.device);
    const ip = await resolveClientIp();

    const { error } = await supabase.from('login_history').insert({
      event_type: input.eventType,
      occurred_at: new Date().toISOString(),
      ip_address: ip,
      access_level: input.accessLevel ?? null,
      status: input.status,
      failure_reason: input.failureReason ?? null,
      ...deviceFields,
    });

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
    }
  } catch (error) {
    console.error('[recordLoginEvent] Exception:', error);
  }
}

export async function fetchActiveLoginSessions(): Promise<
  { success: true; sessions: ActiveLoginSession[] } | { success: false; error: string }
> {
  const history = await fetchLoginHistory(200);
  if (!history.success) {
    return history;
  }

  const cookieStore = await cookies();
  const currentFp = cookieStore.get(SESSION_FP_COOKIE)?.value ?? null;
  const sessions = computeActiveLoginSessions(history.rows, currentFp);
  return { success: true, sessions };
}

export async function fetchLoginHistory(
  limit = 50
): Promise<{ success: true; rows: LoginHistoryRow[] } | { success: false; error: string }> {
  const authenticated = await ensureAuthenticated();
  if (!authenticated) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAdminKey);
    const { data, error } = await supabase
      .from('login_history')
      .select(
        'id, event_type, occurred_at, ip_address, device_type, device_vendor, device_model, os_name, os_version, browser_name, browser_version, access_level, status, failure_reason, session_fingerprint, metadata'
      )
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    return { success: true, rows: (data ?? []) as LoginHistoryRow[] };
  } catch {
    return { success: false, error: 'Failed to load login history' };
  }
}
