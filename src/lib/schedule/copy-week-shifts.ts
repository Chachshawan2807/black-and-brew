export interface WeekShiftCopyRow {
  employee_id: string | null;
  start_time: string;
  end_time: string;
  status: string | null;
  metadata: { location?: string | null; [key: string]: unknown } | null;
}

export interface WeekShiftCopy {
  employee_id: string;
  start_time: string;
  end_time: string;
  status: string;
  metadata: { location?: string | null; [key: string]: unknown };
}

export function buildMissingWeekShiftCopies(input: {
  sourceShifts: readonly WeekShiftCopyRow[];
  targetShifts: readonly WeekShiftCopyRow[];
  sourceStartDate: string;
  targetStartDate: string;
}): {
  copies: WeekShiftCopy[];
  skippedExisting: number;
  skippedCancelled: number;
  skippedRequests: number;
  skippedUnassigned: number;
} {
  const targetBySlot = new Map<string, WeekShiftCopyRow>();
  for (const shift of input.targetShifts) {
    if (!shift.employee_id) continue;
    targetBySlot.set(`${shift.employee_id}:${shift.start_time.slice(0, 10)}`, shift);
  }
  const targetSlots = new Set(targetBySlot.keys());
  const sourceBySlot = new Map<string, WeekShiftCopyRow>();

  for (const shift of input.sourceShifts) {
    if (!shift.employee_id) continue;
    const key = `${shift.employee_id}:${shift.start_time.slice(0, 10)}`;
    sourceBySlot.set(key, shift);
  }

  const copies: WeekShiftCopy[] = [];
  let skippedExisting = 0;
  let skippedCancelled = 0;
  let skippedRequests = 0;
  let skippedUnassigned = 0;
  const sourceStart = new Date(`${input.sourceStartDate}T00:00:00.000Z`);
  const targetStart = new Date(`${input.targetStartDate}T00:00:00.000Z`);

  for (const shift of sourceBySlot.values()) {
    const date = shift.start_time.slice(0, 10);
    const dayOffset = Math.round(
      (new Date(`${date}T00:00:00.000Z`).getTime() - sourceStart.getTime()) / 86_400_000,
    );
    const targetDate = new Date(targetStart);
    targetDate.setUTCDate(targetDate.getUTCDate() + dayOffset);
    const targetDateIso = targetDate.toISOString().slice(0, 10);
    const targetSlot = `${shift.employee_id}:${targetDateIso}`;

    if (shift.status === 'cancelled') {
      skippedCancelled += 1;
      continue;
    }
    const sourceLocation = shift.metadata?.location?.trim();
    if (shift.status === 'on_leave' || sourceLocation === 'ลา') {
      skippedRequests += 1;
      continue;
    }
    if (!shift.status || !sourceLocation || sourceLocation === 'วันหยุด') {
      skippedUnassigned += 1;
      continue;
    }
    if (targetSlots.has(targetSlot)) {
      const targetShift = targetBySlot.get(targetSlot);
      if (targetShift?.status === 'on_leave' || targetShift?.metadata?.location?.trim() === 'ลา') {
        skippedRequests += 1;
      } else {
        skippedExisting += 1;
      }
      continue;
    }

    const targetDayStart = `${targetDateIso}T00:00:00`;
    const targetDayEnd = `${targetDateIso}T23:59:59`;
    copies.push({
      employee_id: shift.employee_id!,
      start_time: targetDayStart,
      end_time: targetDayEnd,
      status: shift.status,
      metadata: { ...shift.metadata },
    });
    targetSlots.add(targetSlot);
  }

  return { copies, skippedExisting, skippedCancelled, skippedRequests, skippedUnassigned };
}
