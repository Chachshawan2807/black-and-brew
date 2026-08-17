import type { KeyboardEvent } from 'react';

const THAI_DAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const;

export function formatScheduleGridDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return `${THAI_DAY_LABELS[date.getDay()]} ${date.getDate()}`;
}

export function getScheduleShiftCellAriaLabel(params: {
  employeeName: string;
  dateLabel: string;
  shiftLabel?: string | null;
  isManagement?: boolean;
}): string {
  const { employeeName, dateLabel, shiftLabel, isManagement } = params;
  if (shiftLabel?.trim()) {
    const managementSuffix = isManagement ? ' (ลา/จัดการ)' : '';
    return `กะ ${shiftLabel} ของ ${employeeName} วัน${dateLabel}${managementSuffix}`;
  }
  return `เพิ่มกะ ${employeeName} วัน${dateLabel}`;
}

export function getScheduleHolidayCellAriaLabel(dateLabel: string, holidayName?: string): string {
  const trimmed = holidayName?.trim();
  if (trimmed) return `วันหยุด ${dateLabel}: ${trimmed}`;
  return `แตะเพื่อเพิ่มวันหยุด ${dateLabel}`;
}

export function getScheduleEmployeeNameEditAriaLabel(name: string): string {
  return `แก้ไขชื่อพนักงาน ${name}`;
}

export function getScheduleEmployeeNameInputName(profileId: string): string {
  return `schedule-employee-name-${profileId}`;
}

export function getScheduleHolidayInputName(isoDate: string): string {
  return `schedule-holiday-${isoDate}`;
}

export function handleGridCellKeyboardActivate(
  event: KeyboardEvent,
  onActivate: () => void,
  disabled = false,
): void {
  if (disabled) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
}
