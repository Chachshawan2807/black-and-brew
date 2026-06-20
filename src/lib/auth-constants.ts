/** PIN session cookie lifetime (30 days). */
export const AUTH_SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export const SESSION_FP_COOKIE = 'bb_session_fp';

export const READ_ONLY_DENY_MSG =
  'บัญชีนี้ดูข้อมูลได้อย่างเดียวค่ะ ไม่สามารถแก้ไขข้อมูลได้นะคะ';

export const FORCE_LOGOUT_DENY_MSG =
  'ต้องใช้รหัสหลัก (สิทธิ์แก้ไข) เท่านั้น จึงจะบังคับออกจากระบบได้';
