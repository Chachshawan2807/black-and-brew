import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  addFrequencyInterval,
  parseRecommendedFrequency,
} from '@/lib/maintenance/parse-recommended-frequency';
import type {
  MaintenanceServiceRecord,
  MaintenanceUrgencyGroup,
  UpcomingMaintenanceTask,
} from '@/lib/maintenance/types';

const BANGKOK_TZ = 'Asia/Bangkok';
const IN_PROGRESS_STATUSES = new Set(['กำลังดำเนินการ', 'pending', 'in_progress']);
const COMPLETED_STATUSES = new Set(['เสร็จสมบูรณ์', 'completed']);

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : toZonedTime(parsed, BANGKOK_TZ);
}

function toIsoDate(date: Date): string {
  return format(toZonedTime(date, BANGKOK_TZ), 'yyyy-MM-dd');
}

function toDisplayDate(isoDate: string): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return isoDate;
  return format(parsed, 'dd-MM-yyyy');
}

export function classifyMaintenanceUrgency(
  dueDate: string,
  currentIsoDate: string,
): MaintenanceUrgencyGroup {
  const due = parseIsoDate(dueDate);
  const today = parseIsoDate(currentIsoDate);
  if (!due || !today) return 'later';

  const daysUntilDue = differenceInCalendarDays(due, today);

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'within_7_days';
  if (daysUntilDue <= 30) return 'within_30_days';
  if (daysUntilDue <= 90) return 'within_90_days';
  return 'later';
}

function buildAdvice(record: MaintenanceServiceRecord): string {
  const advice = record.work_details?.trim();
  if (advice) return advice;

  const taskType = record.task_type?.trim();
  if (taskType) return taskType;

  return 'ตรวจสอบและดำเนินการตามความถี่ที่กำหนด';
}

function computeDueDate(record: MaintenanceServiceRecord): string | null {
  const status = record.status?.trim() ?? '';
  const frequency = parseRecommendedFrequency(record.recommended_frequency);

  if (IN_PROGRESS_STATUSES.has(status)) {
    const activeDate = parseIsoDate(record.start_date);
    return activeDate ? toIsoDate(activeDate) : null;
  }

  if (!COMPLETED_STATUSES.has(status) || !frequency) {
    return null;
  }

  const baseDate = parseIsoDate(record.completion_date) ?? parseIsoDate(record.start_date);
  if (!baseDate) return null;

  return toIsoDate(addFrequencyInterval(baseDate, frequency));
}

export function computeUpcomingMaintenanceTasks(
  records: MaintenanceServiceRecord[],
  currentIsoDate: string,
): UpcomingMaintenanceTask[] {
  const tasks: UpcomingMaintenanceTask[] = [];

  for (const record of records) {
    const dueDate = computeDueDate(record);
    const equipment = record.equipment?.trim();
    if (!dueDate || !equipment) continue;

    tasks.push({
      id: record.id ?? `${equipment}-${dueDate}`,
      equipment,
      advice: buildAdvice(record),
      dueDate,
      urgency: classifyMaintenanceUrgency(dueDate, currentIsoDate),
    });
  }

  return tasks.toSorted((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export { toDisplayDate };
