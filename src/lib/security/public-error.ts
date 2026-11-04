import { toUserFacingError } from '@/lib/user-facing-error';

/** Generic client-facing error (cron/API JSON). Never leak stack, SQL, or env details. */
export const PUBLIC_INTERNAL_ERROR = 'ระบบขัดข้อง กรุณาลองใหม่';

export const PUBLIC_UNAUTHORIZED_ERROR = 'ไม่มีสิทธิ์เข้าถึง';

export const PUBLIC_CONFIG_ERROR = 'การตั้งค่าระบบมีปัญหา ติดต่อผู้ดูแล';

/** API/JSON responses: map known failures to Thai; hide technical exception text. */
export function toPublicErrorMessage(error: unknown): string {
  return toUserFacingError(error, PUBLIC_INTERNAL_ERROR);
}
