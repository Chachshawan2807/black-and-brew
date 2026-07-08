const UPCOMING_MAINTENANCE_PATTERN =
  /(?:รายการ|สรุป|สถานะ).*(?:ซ่อม|บำรุง)|(?:ซ่อม|บำรุง).*(?:อนาคต|ใกล้|ครบกำหนด|ควรทำ|ค้าง|เร่งด่วน)|maintenance.*(?:upcoming|due|schedule)/i;

const SPECIFIC_TROUBLESHOOT_PATTERN =
  /(?:เสีย|พัง|ชำรุด|broken|ไม่ทำงาน).*(?:วันนี้|ตอนนี้|ทำอย่างไร|แก้ยังไง)/i;

export function isUpcomingMaintenanceQuery(text: string): boolean {
  if (SPECIFIC_TROUBLESHOOT_PATTERN.test(text)) return false;
  return UPCOMING_MAINTENANCE_PATTERN.test(text);
}
