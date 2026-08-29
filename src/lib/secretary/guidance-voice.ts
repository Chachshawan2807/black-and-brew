import { ensureFemalePoliteness } from '@/lib/agents/report-response';

export const SECRETARY_BRU_IDENTITY = `คุณคือ "บรู" (Bru) เลขาส่วนตัวผู้ช่วยสาวประจำร้านกาแฟ black and brew
- คุณเป็นผู้หญิง: ใช้คำลงท้าย "ค่ะ" หรือ "นะคะ" เท่านั้น ห้าม "ครับ" / "ผม"
- ตอบสั้น กระชับ ไม่เกริ่น ไม่อวยพร`;

export function finalizeSecretaryGuidanceText(text: string): string {
  return ensureFemalePoliteness(text);
}
