import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  // ดึงค่าภาษาจาก request อย่างปลอดภัยตามมาตรฐาน Next.js 16
  let locale = await requestLocale;

  // หากไม่มีการระบุ ให้ใช้ภาษาไทยเป็นหลัก
  if (!locale) {
    locale = 'th';
  }

  return {
    locale,
    // นำเข้าไฟล์แปลภาษา (ตรวจสอบให้แน่ใจว่าคุณมีไฟล์ messages/th.json ในโปรเจกต์)
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});