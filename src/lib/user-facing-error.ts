/**
 * Nielsen heuristic 9: user-facing errors stay plain language.
 * Technical Supabase/Postgres detail belongs in the console only.
 */

export type SupabaseErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

const THAI_CHAR = /[\u0E00-\u0E7F]/;

function asRecord(error: unknown): SupabaseErrorLike | null {
  if (!error || typeof error !== 'object') return null;
  return error as SupabaseErrorLike;
}

function rawMessage(error: unknown): string {
  if (typeof error === 'string') return error.trim();
  if (error instanceof Error) return error.message.trim();
  const record = asRecord(error);
  if (record?.message && typeof record.message === 'string') return record.message.trim();
  return '';
}

function looksTechnical(message: string, code?: string | null): boolean {
  if (code && /^[0-9A-Z]{2,}/.test(code)) return true;
  if (/PGRST|JWT|RLS|postgres|supabase|column|relation|violates|duplicate key|network|fetch|ECONN|timeout/i.test(message)) {
    return true;
  }
  if (/^[A-Z_]{3,}$/.test(message)) return true;
  return false;
}

function looksUserFacingThai(message: string): boolean {
  if (!message || !THAI_CHAR.test(message)) return false;
  return !looksTechnical(message);
}

/** Log Supabase/technical detail for operators; never show this string in UI. */
export function logSupabaseError(context: string, error: unknown): void {
  const record = asRecord(error);
  const message = rawMessage(error) || 'unknown error';
  if (record?.details || record?.code || record?.hint) {
    console.error(`Supabase Error (${context}):`, message, record.details, record.code, record.hint);
    return;
  }
  console.error(`Supabase Error (${context}):`, message);
}

/**
 * Map an unknown failure to Thai UI copy.
 * Known Postgres/auth/network codes get specific messages; otherwise `fallbackTh`.
 * Already-safe Thai strings (non-technical) are passed through.
 */
export function toUserFacingError(error: unknown, fallbackTh: string): string {
  const record = asRecord(error);
  const code = record?.code ?? null;
  const message = rawMessage(error);

  if (code === '23505' || /duplicate key|unique constraint/i.test(message)) {
    return 'ข้อมูลซ้ำกับที่มีอยู่แล้ว กรุณาตรวจสอบแล้วลองใหม่';
  }
  if (code === '23503' || /foreign key/i.test(message)) {
    return 'ไม่พบข้อมูลที่อ้างอิง กรุณาตรวจสอบแล้วลองใหม่';
  }
  if (
    code === '42501' ||
    /permission denied|row-level security|not authorized|JWT|auth/i.test(message)
  ) {
    return 'ไม่มีสิทธิ์ทำรายการนี้ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง';
  }
  if (
    /Failed to fetch|NetworkError|network|ECONN|ETIMEDOUT|timeout|server_unreachable/i.test(
      message,
    )
  ) {
    return 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบเน็ตแล้วลองใหม่';
  }

  if (looksUserFacingThai(message)) {
    return message;
  }

  return fallbackTh;
}
