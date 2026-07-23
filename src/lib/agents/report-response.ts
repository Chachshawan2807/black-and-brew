/**
 * Bru Report Style — shared short report formatting for deterministic AI replies
 * and system-prompt guidance for LLM answers.
 */

export const BRU_REPORT_RULES = `
[Bru Report Style — บังคับ]
- เป็นผู้หญิง: ใช้คำลงท้าย "ค่ะ" หรือ "นะคะ" เท่านั้น ห้าม "ครับ" / "ผม"
- รูปแบบรายงานสั้น: หัวข้อ 1 บรรทัด → bullet "-" → สรุปจำนวนท้าย
- ห้ามใช้ ** (ตัวหนา) ห้ามตาราง markdown ห้าม UUID
- วันที่แสดงเป็น DD-MM-YYYY เสมอ
- Hyper-concise: ไม่เกริ่น ไม่อวยพร ไม่เกิน ~15 บรรทัด
`.trim();

export type BruReportOptions = {
  header: string;
  bullets: string[];
  /** Shown when bullets is empty (politeness auto-appended). */
  emptyMessage?: string;
  footerCount?: { label: string; count: number };
  /** Optional section lines inserted between header and bullets (e.g. group titles). */
  sections?: string[];
  maxBullets?: number;
};

const FEMALE_ENDINGS = /(ค่ะ|นะคะ)\s*$/;
const MALE_ENDINGS = /(ครับ|คับ|ครับผม)\s*$/;

export function stripForbiddenMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/^\s*\|.*\|\s*$/gm, '').trim();
}

export function ensureFemalePoliteness(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return 'ค่ะ';
  if (FEMALE_ENDINGS.test(trimmed)) return trimmed;
  if (MALE_ENDINGS.test(trimmed)) {
    return trimmed.replace(MALE_ENDINGS, 'ค่ะ');
  }
  return `${trimmed}ค่ะ`;
}

export function formatIsoDateDisplay(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!m) return isoDate;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function buildBruReport(options: BruReportOptions): string {
  const maxBullets = options.maxBullets ?? 5;

  if (options.bullets.length === 0) {
    const empty =
      options.emptyMessage ??
      `${options.header}\nไม่มีข้อมูลที่ต้องรายงานในขณะนี้`;
    return ensureFemalePoliteness(stripForbiddenMarkdown(empty));
  }

  const lines: string[] = [stripForbiddenMarkdown(options.header)];

  if (options.sections?.length) {
    lines.push('');
    for (const section of options.sections) {
      lines.push(stripForbiddenMarkdown(section));
    }
  }

  lines.push('');
  for (const bullet of options.bullets.slice(0, maxBullets)) {
    const cleaned = stripForbiddenMarkdown(bullet).replace(/^[-•]\s*/, '');
    lines.push(`- ${cleaned}`);
  }

  if (options.bullets.length > maxBullets) {
    lines.push(`- …และอีก ${options.bullets.length - maxBullets} รายการ`);
  }

  if (options.footerCount) {
    lines.push('');
    lines.push(
      ensureFemalePoliteness(
        `รวม ${options.footerCount.count} ${options.footerCount.label}`,
      ),
    );
  } else {
    const last = lines[lines.length - 1] ?? '';
    lines[lines.length - 1] = ensureFemalePoliteness(last);
  }

  return lines.join('\n').trim();
}
