type ShiftRange = {
  startDate: string;
  endDate: string;
  rosterStart: string;
  rosterEnd: string;
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
      rosterStart: string;
      rosterEnd: string;
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
  rosterStart,
  rosterEnd,
}: ShiftRange): DashboardShiftQueryPlan {
  if (rangesOverlap(startDate, endDate, rosterStart, rosterEnd)) {
    return {
      mode: 'combined',
      startDate: dateMin(startDate, rosterStart),
      endDate: dateMax(endDate, rosterEnd),
    };
  }

  return {
    mode: 'separate',
    weeklyStart: startDate,
    weeklyEnd: endDate,
    rosterStart,
    rosterEnd,
  };
}

function isShiftInRange(shift: ShiftLike, startDate: string, endDate: string) {
  const shiftDate = shift.start_time?.split('T')[0];
  return Boolean(shiftDate && shiftDate >= startDate && shiftDate <= endDate);
}

export function splitDashboardShiftsByRange<TShift extends ShiftLike>(
  shifts: TShift[],
  { startDate, endDate, rosterStart, rosterEnd }: ShiftRange,
) {
  return {
    weeklyShifts: shifts.filter((shift) => isShiftInRange(shift, startDate, endDate)),
    rosterShifts: shifts.filter((shift) => isShiftInRange(shift, rosterStart, rosterEnd)),
  };
}
