export type PasskeyErrorLocale = 'th' | 'en';

export const PASSKEY_ERROR_MAP: Record<string, { th: string; en: string }> = {
  'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อนบันทึกเครื่องนี้': {
    th: 'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อนบันทึกเครื่องนี้',
    en: 'Sign in with your PIN before saving this device',
  },
  'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อน': {
    th: 'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อน',
    en: 'Sign in with your PIN first',
  },
  'กรุณาเข้าสู่ระบบก่อน': {
    th: 'กรุณาเข้าสู่ระบบก่อน',
    en: 'Please sign in first',
  },
  'ไม่พบข้อมูลอุปกรณ์': {
    th: 'ไม่พบข้อมูลอุปกรณ์',
    en: 'Device information is missing',
  },
  'ไม่พบข้อมูลเครื่องนี้': {
    th: 'ไม่พบข้อมูลเครื่องนี้',
    en: 'This device could not be identified',
  },
  'ไม่สามารถเตรียมการลงทะเบียนลายนิ้วมือได้': {
    th: 'ไม่สามารถเตรียมการลงทะเบียนลายนิ้วมือได้',
    en: 'Could not start biometric registration',
  },
  'ไม่สามารถเตรียมการเข้าด้วยลายนิ้วมือได้': {
    th: 'ไม่สามารถเตรียมการเข้าด้วยลายนิ้วมือได้',
    en: 'Could not start biometric sign-in',
  },
  'ข้อมูลลงทะเบียนไม่ถูกต้อง': {
    th: 'ข้อมูลลงทะเบียนไม่ถูกต้อง',
    en: 'Invalid registration data',
  },
  'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง': {
    th: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง',
    en: 'Invalid sign-in data',
  },
  'หมดเวลาลงทะเบียน กรุณาลองใหม่': {
    th: 'หมดเวลาลงทะเบียน กรุณาลองใหม่',
    en: 'Registration timed out. Try again',
  },
  'หมดเวลาเข้าสู่ระบบ กรุณาลองใหม่': {
    th: 'หมดเวลาเข้าสู่ระบบ กรุณาลองใหม่',
    en: 'Sign-in timed out. Try again',
  },
  'ยืนยันลายนิ้วมือไม่สำเร็จ': {
    th: 'ยืนยันลายนิ้วมือไม่สำเร็จ',
    en: 'Biometric verification failed',
  },
  'บันทึกลายนิ้วมือไม่สำเร็จ': {
    th: 'บันทึกลายนิ้วมือไม่สำเร็จ',
    en: 'Could not save biometric login',
  },
  'ลงทะเบียนลายนิ้วมือไม่สำเร็จ': {
    th: 'ลงทะเบียนลายนิ้วมือไม่สำเร็จ',
    en: 'Biometric registration failed',
  },
  'เข้าสู่ระบบด้วยลายนิ้วมือไม่สำเร็จ': {
    th: 'เข้าสู่ระบบด้วยลายนิ้วมือไม่สำเร็จ',
    en: 'Biometric sign-in failed',
  },
  'ลบลายนิ้วมือไม่สำเร็จ': {
    th: 'ลบลายนิ้วมือไม่สำเร็จ',
    en: 'Could not remove biometric login',
  },
  'ไม่พบลายนิ้วมือที่ลงทะเบียนไว้': {
    th: 'ไม่พบลายนิ้วมือที่ลงทะเบียนไว้',
    en: 'No biometric login registered on this device',
  },
  'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า': {
    th: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า',
    en: 'Biometric scan cancelled',
  },
  'การสแกนลายนิ้วมือ/ใบหน้าถูกยกเลิก': {
    th: 'การสแกนลายนิ้วมือ/ใบหน้าถูกยกเลิก',
    en: 'Biometric scan was cancelled',
  },
};

export function localizePasskeyError(error: string, locale: PasskeyErrorLocale): string {
  const mapped = PASSKEY_ERROR_MAP[error];
  if (mapped) return locale === 'th' ? mapped.th : mapped.en;
  return error;
}
