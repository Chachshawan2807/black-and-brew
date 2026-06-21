type ShiftRange = {
  startDate: string;
  endDate: string;
  monthStart: string;
  monthEnd: string;
};

type ShiftLike = {
  start_time?: string | null;
};

export type DashboardShiftQueryPlan =
  | {
      mode: 'combined';
      startDate: string;
      endDate: string;
    }
  | {
      mode: 'separate';
      weeklyStart: string;
      weeklyEnd: string;
      monthlyStart: string;
      monthlyEnd: string;
    };

function dateMin(a: string, b: string) {
  return a <= b ? a : b;
}

function dateMax(a: string, b: string) {
  return a >= b ? a : b;
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && startB <= endA;
}

export function getDashboardShiftQueryPlan({
  startDate,
  endDate,
  monthStart,
  monthEnd,
}: ShiftRange): DashboardShiftQueryPlan {
  if (rangesOverlap(startDate, endDate, monthStart, monthEnd)) {
    return {
      mode: 'combined',
      startDate: dateMin(startDate, monthStart),
      endDate: dateMax(endDate, monthEnd),
    };
  }

  return {
    mode: 'separate',
    weeklyStart: startDate,
    weeklyEnd: endDate,
    monthlyStart: monthStart,
    monthlyEnd: monthEnd,
  };
}

function isShiftInRange(shift: ShiftLike, startDate: string, endDate: string) {
  const shiftDate = shift.start_time?.split('T')[0];
  return Boolean(shiftDate && shiftDate >= startDate && shiftDate <= endDate);
}

export function splitDashboardShiftsByRange<TShift extends ShiftLike>(
  shifts: TShift[],
  { startDate, endDate, monthStart, monthEnd }: ShiftRange,
) {
  return {
    weeklyShifts: shifts.filter((shift) => isShiftInRange(shift, startDate, endDate)),
    monthlyShifts: shifts.filter((shift) => isShiftInRange(shift, monthStart, monthEnd)),
  };
}
