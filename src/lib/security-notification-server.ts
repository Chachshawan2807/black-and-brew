import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import { PIN_LOCKOUT_KIND, SECURITY_MODULE } from '@/lib/security-notification';
import { dispatchSecurityWebPush } from '@/lib/security-web-push';

export function maskClientIp(ip: string): string {
  const trimmed = ip.trim();
  if (!trimmed) return 'unknown';

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}:…`;
    return '…';
  }

  const parts = trimmed.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  return trimmed;
}

function hashIpForDedup(ip: string): string {
  return createHash('sha256').update(ip.trim()).digest('hex').slice(0, 16);
}

export function pinLockoutNotificationLogId(clientIp: string, hourBucket: string): string {
  return `bb-pin-lockout-${hashIpForDedup(clientIp)}-${hourBucket}`;
}

function pinLockoutHourBucket(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}`;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function buildPinLockoutCopy(maskedIp: string, resetAt: number, locale: string) {
  const isTh = locale === 'th';
  const minutesLeft = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
  const title = isTh ? '⚠️ มีการพยายามเดา PIN' : '⚠️ PIN brute-force detected';
  const summary = isTh
    ? `IP ${maskedIp} ถูก lockout ประมาณ ${minutesLeft} นาที`
    : `IP ${maskedIp} locked out for about ${minutesLeft} minutes`;
  const fieldSummary = isTh
    ? `ตรวจพบการใส่ PIN ผิดซ้ำจากภายนอก\nIP: ${maskedIp}\nระยะเวลา lockout: ~${minutesLeft} นาที`
    : `Repeated failed PIN attempts from outside\nIP: ${maskedIp}\nLockout: ~${minutesLeft} minutes`;
  return { title, summary, fieldSummary };
}

export async function recordPinLockoutSecurityAlert(
  clientIp: string,
  resetAt: number,
  locale = 'th',
): Promise<{ success: boolean; skipped?: boolean; logId: string }> {
  const logId = pinLockoutNotificationLogId(clientIp, pinLockoutHourBucket());
  const isTh = locale === 'th';
  const maskedIp = maskClientIp(clientIp);
  const copy = buildPinLockoutCopy(maskedIp, resetAt, locale);
  const settingsPath = `/${locale}/settings`;

  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, logId };

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('data_change_logs')
      .select('id')
      .eq('module', SECURITY_MODULE)
      .eq('entity_type', PIN_LOCKOUT_KIND)
      .eq('entity_id', logId)
      .limit(1);

    if (lookupError) {
      if (lookupError.code === 'PGRST205' || lookupError.message?.includes('Could not find the table')) {
        return { success: false, logId };
      }
      console.error('Supabase Error:', lookupError.message, lookupError.details);
      throw lookupError;
    }

    if (existing && existing.length > 0) {
      return { success: true, skipped: true, logId };
    }

    const metadata = {
      kind: PIN_LOCKOUT_KIND,
      url: settingsPath,
      notificationLogId: logId,
      title: copy.title,
      summary: copy.summary,
      fieldSummary: copy.fieldSummary,
      locale,
      priority: 'high' as const,
      maskedIp,
      resetAt,
    };

    const { data: inserted, error } = await supabase
      .from('data_change_logs')
      .insert({
        occurred_at: new Date().toISOString(),
        actor_id: null,
        actor_label: isTh ? 'ระบบความปลอดภัย' : 'Security system',
        actor_access_level: 'system',
        action: 'UPDATE',
        module: SECURITY_MODULE,
        entity_type: PIN_LOCKOUT_KIND,
        entity_id: logId,
        entity_label: maskedIp,
        field_changes: [],
        old_value: null,
        new_value: sanitizeJsonValue({ kind: PIN_LOCKOUT_KIND, maskedIp, resetAt }),
        source: 'system',
        status: 'success',
        ip_address: clientIp,
        metadata,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return { success: false, logId };
      }
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    const row = inserted as DataChangeLogRow;
    await dispatchSecurityWebPush(row);
    return { success: true, logId };
  } catch (error) {
    console.error('[recordPinLockoutSecurityAlert] Exception:', error);
    return { success: false, logId };
  }
}
