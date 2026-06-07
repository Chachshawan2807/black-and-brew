import { format, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const THAI_MONTH_PATTERNS: Array<{ pattern: RegExp; month: number }> = [
  { pattern: /(?:ม\.?\s*ค\.?|มกราคม)/i, month: 1 },
  { pattern: /(?:ก\.?\s*พ\.?|กุมภาพันธ์)/i, month: 2 },
  { pattern: /(?:มี\.?\s*ค\.?|มีนาคม)/i, month: 3 },
  { pattern: /(?:เม\.?\s*ย\.?|เมษายน)/i, month: 4 },
  { pattern: /(?:พ\.?\s*ค\.?|พฤษภาคม)/i, month: 5 },
  { pattern: /(?:มิ\.?\s*ย\.?|มิถุนายน)/i, month: 6 },
  { pattern: /(?:ก\.?\s*ค\.?|กรกฎาคม)/i, month: 7 },
  { pattern: /(?:ส\.?\s*ค\.?|สิงหาคม)/i, month: 8 },
  { pattern: /(?:ก\.?\s*ย\.?|กันยายน)/i, month: 9 },
  { pattern: /(?:ต\.?\s*ค\.?|ตุลาคม)/i, month: 10 },
  { pattern: /(?:พ\.?\s*ย\.?|พฤศจิกายน)/i, month: 11 },
  { pattern: /(?:ธ\.?\s*ค\.?|ธันวาคม)/i, month: 12 },
];

function inferYear(yearPart: number, currentYear: number): number {
  if (yearPart >= 2400) return yearPart - 543;
  if (yearPart >= 1000) return yearPart;

  const asCe = 2000 + yearPart;
  const asBe = 2500 + yearPart - 543;
  return Math.abs(asCe - currentYear) <= Math.abs(asBe - currentYear) ? asCe : asBe;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  const date = toZonedTime(new Date(year, month - 1, day, 12, 0, 0), 'Asia/Bangkok');
  if (!isValid(date) || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return format(date, 'yyyy-MM-dd');
}

function detectThaiMonth(text: string): number | null {
  for (const { pattern, month } of THAI_MONTH_PATTERNS) {
    if (pattern.test(text)) return month;
  }
  return null;
}

export function parseExplicitScheduleDate(text: string, currentIsoDate: string): string | null {
  const currentYear = Number.parseInt(currentIsoDate.slice(0, 4), 10);

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return toIsoDate(
      Number.parseInt(isoMatch[1], 10),
      Number.parseInt(isoMatch[2], 10),
      Number.parseInt(isoMatch[3], 10),
    );
  }

  const thaiMonth = detectThaiMonth(text);
  if (thaiMonth !== null) {
    const thaiDateMatch = text.match(
      /(?:วันที่\s*)?(\d{1,2})(?:\s*(?:เดือน\s*)?(?:ม\.?\s*ค\.?|ก\.?\s*พ\.?|มี\.?\s*ค\.?|เม\.?\s*ย\.?|พ\.?\s*ค\.?|มิ\.?\s*ย\.?|ก\.?\s*ค\.?|ส\.?\s*ค\.?|ก\.?\s*ย\.?|ต\.?\s*ค\.?|พ\.?\s*ย\.?|ธ\.?\s*ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม))(?:\s*(?:พ\.?\s*ศ\.?|ปี)?\s*(\d{2,4}))?/i,
    );
    if (thaiDateMatch) {
      const day = Number.parseInt(thaiDateMatch[1], 10);
      const year = thaiDateMatch[2]
        ? inferYear(Number.parseInt(thaiDateMatch[2], 10), currentYear)
        : currentYear;
      return toIsoDate(year, thaiMonth, day);
    }
  }

  const numericDateMatch = text.match(
    /(?:วันที่\s*)?(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2,4}))?/i,
  );
  if (numericDateMatch) {
    const day = Number.parseInt(numericDateMatch[1], 10);
    const month = Number.parseInt(numericDateMatch[2], 10);
    const year = numericDateMatch[3]
      ? inferYear(Number.parseInt(numericDateMatch[3], 10), currentYear)
      : currentYear;
    return toIsoDate(year, month, day);
  }

  return null;
}
