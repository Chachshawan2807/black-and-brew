export type InventoryShortageRisk = 'normal' | 'medium' | 'high';

export type InventoryRecommendationConfidence = 'มั่นใจสูง' | 'ข้อมูลปานกลาง' | 'ข้อมูลน้อย';

export type InventoryRecommendationTransaction = {
  type: 'OUT' | string | null;
  quantity: number | string | null;
  created_at: string | null;
};

export type InventoryRecommendationHoliday = {
  date: string;
  name?: string | null;
};

export type InventoryTargetRecommendationInput = {
  currentTargetStock: number;
  transactions: InventoryRecommendationTransaction[];
  holidays: InventoryRecommendationHoliday[];
  shortageRisk: InventoryShortageRisk;
  leadTimeDays: number;
  today?: string;
};

export type InventoryTargetRecommendation = {
  averageDailyUsage: number;
  baseUsage14Days: number;
  holidayBuffer: number;
  leadTimeBuffer: number;
  shortageRiskBuffer: number;
  recommendedTargetStock: number;
  displayValue: string;
  confidence: InventoryRecommendationConfidence;
  abnormalOutCount: number;
  explanationLines: string[];
};

const TARGET_COVERAGE_DAYS = 14;
const LONG_WEEKEND_EXTRA = 0.2;
const RISK_BUFFER: Record<InventoryShortageRisk, number> = {
  normal: 0,
  medium: 0.15,
  high: 0.3,
};

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function differenceInCalendarDays(later: string, earlier: string) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDateOnly(later).getTime() - parseDateOnly(earlier).getTime()) / msPerDay);
}

function addDays(date: string, days: number) {
  const result = parseDateOnly(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

function lowerHalfMedian(values: number[]) {
  if (values.length < 4) return median(values);
  const sorted = [...values].sort((a, b) => a - b);
  return median(sorted.slice(0, Math.ceil(sorted.length / 2)));
}

function isWithinNext14Days(date: string, today: string) {
  const diff = differenceInCalendarDays(date, today);
  return diff >= 0 && diff < TARGET_COVERAGE_DAYS;
}

function hasThreeConsecutiveHolidayDates(dates: string[]) {
  const uniqueDates = [...new Set(dates)].sort();
  const dateSet = new Set(uniqueDates);
  return uniqueDates.some((date) =>
    dateSet.has(addDays(date, 1)) && dateSet.has(addDays(date, 2))
  );
}

export function formatTargetStockRecommendation({
  currentTargetStock,
  recommendedTargetStock,
}: {
  currentTargetStock: number;
  recommendedTargetStock: number;
}) {
  const current = Math.max(0, Math.ceil(Number(currentTargetStock) || 0));
  const recommended = Math.max(0, Math.ceil(Number(recommendedTargetStock) || 0));
  const diff = recommended - current;
  const isMeaningfullyHigher = recommended > current && (diff >= 2 || diff / Math.max(current, 1) >= 0.1);

  return isMeaningfullyHigher ? `${current} → ${recommended}` : String(current);
}

export function computeInventoryTargetRecommendation(
  input: InventoryTargetRecommendationInput
): InventoryTargetRecommendation {
  const today = toDateOnly(input.today ?? new Date().toISOString());
  const outRows = input.transactions
    .filter((row) => row.type === 'OUT')
    .map((row) => ({
      quantity: Number(row.quantity) || 0,
      date: row.created_at ? toDateOnly(row.created_at) : '',
    }))
    .filter((row) => row.quantity > 0 && row.date);

  const quantities = outRows.map((row) => row.quantity);
  const medianOut = median(quantities);
  const p95Out = percentile(quantities, 95);
  const lowerMedianOut = lowerHalfMedian(quantities);
  const abnormalThreshold = Math.min(
    medianOut > 0 ? medianOut * 3 : Number.POSITIVE_INFINITY,
    p95Out > 0 ? p95Out : Number.POSITIVE_INFINITY,
    lowerMedianOut > 0 ? lowerMedianOut * 3 : Number.POSITIVE_INFINITY,
  );
  const normalRows = Number.isFinite(abnormalThreshold)
    ? outRows.filter((row) => row.quantity <= abnormalThreshold)
    : outRows;
  const abnormalOutCount = outRows.length - normalRows.length;
  const usageTotal = normalRows.reduce((sum, row) => sum + row.quantity, 0);
  const firstUsageDate = normalRows.map((row) => row.date).sort()[0];
  const usageDays = firstUsageDate
    ? Math.max(1, differenceInCalendarDays(today, firstUsageDate))
    : TARGET_COVERAGE_DAYS;
  const averageDailyUsage = usageTotal / usageDays;
  const baseUsage14Days = averageDailyUsage * TARGET_COVERAGE_DAYS;

  const holidaysInWindow = input.holidays
    .map((holiday) => holiday.date)
    .filter((date) => isWithinNext14Days(date, today));
  const holidayMultiplierExtra = holidaysInWindow.length * 0.1
    + (hasThreeConsecutiveHolidayDates(holidaysInWindow) ? LONG_WEEKEND_EXTRA : 0);
  const holidayBuffer = baseUsage14Days * holidayMultiplierExtra;
  const leadTimeBuffer = averageDailyUsage * Math.max(0, Number(input.leadTimeDays) || 0);
  const shortageRiskBuffer = baseUsage14Days * RISK_BUFFER[input.shortageRisk];
  const calculatedValue = baseUsage14Days + holidayBuffer + leadTimeBuffer + shortageRiskBuffer;
  const recommendedTargetStock = Math.max(0, Math.ceil(calculatedValue));
  const confidence: InventoryRecommendationConfidence =
    normalRows.length === 0 || usageDays < TARGET_COVERAGE_DAYS
      ? 'ข้อมูลน้อย'
      : normalRows.length >= 10
        ? 'มั่นใจสูง'
        : 'ข้อมูลปานกลาง';

  return {
    averageDailyUsage,
    baseUsage14Days,
    holidayBuffer,
    leadTimeBuffer,
    shortageRiskBuffer,
    recommendedTargetStock,
    displayValue: formatTargetStockRecommendation({
      currentTargetStock: input.currentTargetStock,
      recommendedTargetStock,
    }),
    confidence,
    abnormalOutCount,
    explanationLines: [
      `ใช้เฉลี่ย ${averageDailyUsage.toFixed(1)}/วัน`,
      `14 วัน = ${Math.ceil(baseUsage14Days)}`,
      `lead time ${Math.max(0, Number(input.leadTimeDays) || 0)} วัน = +${Math.ceil(leadTimeBuffer)}`,
      `วันหยุด = +${Math.ceil(holidayBuffer)}`,
      `ความเสี่ยง = +${Math.ceil(shortageRiskBuffer)}`,
      `แนะนำ ${recommendedTargetStock}`,
    ],
  };
}
