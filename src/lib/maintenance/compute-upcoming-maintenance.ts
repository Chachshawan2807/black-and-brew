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

export function formatDueDateWithDaysRemaining(
  dueDate: string,
  currentIsoDate: string,
): string {
  const displayDate = toDisplayDate(dueDate);
  const due = parseIsoDate(dueDate);
  const today = parseIsoDate(currentIsoDate);
  if (!due || !today) return displayDate;

  const daysUntilDue = differenceInCalendarDays(due, today);
  if (daysUntilDue < 0) return `${displayDate} (เลย ${Math.abs(daysUntilDue)} วัน)`;
  if (daysUntilDue === 0) return `${displayDate} (วันนี้)`;
  return `${displayDate} (${daysUntilDue} วัน)`;
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

function normalizeEquipmentKey(equipment: string): string {
  return equipment.trim().replace(/\s+/g, '').toLowerCase();
}

function recordBaseDateIso(record: MaintenanceServiceRecord): string | null {
  const baseDate = parseIsoDate(record.completion_date) ?? parseIsoDate(record.start_date);
  return baseDate ? toIsoDate(baseDate) : null;
}

function computeDueDate(record: MaintenanceServiceRecord): string | null {
  const frequency = parseRecommendedFrequency(record.recommended_frequency);
  if (!frequency) return null;

  const baseDate = parseIsoDate(record.completion_date) ?? parseIsoDate(record.start_date);
  if (!baseDate) return null;

  return toIsoDate(addFrequencyInterval(baseDate, frequency));
}

/** Prefer the newest service event that can produce a due date for each asset. */
function selectLatestRecordsPerEquipment(
  records: MaintenanceServiceRecord[],
): MaintenanceServiceRecord[] {
  const latestByEquipment = new Map<
    string,
    { record: MaintenanceServiceRecord; baseDate: string; displayName: string }
  >();

  for (const record of records) {
    const displayName = record.equipment?.trim();
    if (!displayName) continue;
    if (!computeDueDate(record)) continue;

    const baseDate = recordBaseDateIso(record);
    if (!baseDate) continue;

    const key = normalizeEquipmentKey(displayName);
    const existing = latestByEquipment.get(key);
    if (!existing || baseDate > existing.baseDate) {
      latestByEquipment.set(key, { record, baseDate, displayName });
    }
  }

  return [...latestByEquipment.values()].map(({ record, displayName }) => ({
    ...record,
    equipment: displayName,
  }));
}

export function computeUpcomingMaintenanceTasks(
  records: MaintenanceServiceRecord[],
  currentIsoDate: string,
): UpcomingMaintenanceTask[] {
  const tasks: UpcomingMaintenanceTask[] = [];

  for (const record of selectLatestRecordsPerEquipment(records)) {
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
