import { addDays, addMonths, addWeeks, addYears } from 'date-fns';

type FrequencyUnit = 'day' | 'week' | 'month' | 'year';

interface ParsedFrequency {
  amount: number;
  unit: FrequencyUnit;
}

const FREQUENCY_PATTERNS: Array<{ pattern: RegExp; amount: number; unit: FrequencyUnit }> = [
  { pattern: /ทุก\s*(\d+)\s*วัน/i, amount: 0, unit: 'day' },
  { pattern: /ทุก\s*(\d+)\s*สัปดาห์/i, amount: 0, unit: 'week' },
  { pattern: /ทุก\s*(\d+)\s*เดือน/i, amount: 0, unit: 'month' },
  { pattern: /ทุก\s*(\d+)\s*ปี/i, amount: 0, unit: 'year' },
  { pattern: /(?:รายวัน|ทุกวัน)/i, amount: 1, unit: 'day' },
  { pattern: /(?:รายสัปดาห์|ทุกสัปดาห์)/i, amount: 1, unit: 'week' },
  { pattern: /(?:รายเดือน|ทุกเดือน)/i, amount: 1, unit: 'month' },
  { pattern: /(?:รายปี|ทุกปี)/i, amount: 1, unit: 'year' },
];

export function parseRecommendedFrequency(
  frequency: string | null | undefined,
): ParsedFrequency | null {
  const normalized = frequency?.trim();
  if (!normalized) return null;

  for (const entry of FREQUENCY_PATTERNS) {
    const match = normalized.match(entry.pattern);
    if (!match) continue;

    const amount = entry.amount > 0 ? entry.amount : Number(match[1] ?? '0');
    if (!Number.isFinite(amount) || amount <= 0) continue;

    return { amount, unit: entry.unit };
  }

  return null;
}

export function addFrequencyInterval(baseDate: Date, frequency: ParsedFrequency): Date {
  switch (frequency.unit) {
    case 'day':
      return addDays(baseDate, frequency.amount);
    case 'week':
      return addWeeks(baseDate, frequency.amount);
    case 'month':
      return addMonths(baseDate, frequency.amount);
    case 'year':
      return addYears(baseDate, frequency.amount);
  }
}
