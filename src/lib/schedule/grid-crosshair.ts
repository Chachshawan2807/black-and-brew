export type ScheduleGridFocus = { employeeId: string; date: string } | null;

export function scheduleCrosshairRowBandClass(
  employeeId: string,
  date: string,
  focus: ScheduleGridFocus,
): string {
  if (!focus || focus.employeeId !== employeeId) return '';
  if (focus.date === date) return '';
  return 'bb-schedule-crosshair-row-band';
}

export function scheduleCrosshairColBandClass(
  _employeeId: string,
  _date: string,
  focus: ScheduleGridFocus,
): string {
  if (!focus) return '';
  // Column guide is rendered on day headers/footer only (bb-schedule-crosshair-col-h)
  // so row and column fills never stack in the grid body.
  return '';
}

/** Active cell intersection — row + column meet here. */
export function scheduleCrosshairCellClass(
  employeeId: string,
  date: string,
  focus: ScheduleGridFocus,
): string {
  if (!focus) return '';
  if (focus.employeeId === employeeId && focus.date === date) {
    return 'bb-schedule-crosshair-cell';
  }
  return [scheduleCrosshairRowBandClass(employeeId, date, focus), scheduleCrosshairColBandClass(employeeId, date, focus)]
    .filter(Boolean)
    .join(' ');
}

export function scheduleCrosshairNameClass(
  employeeId: string,
  focus: ScheduleGridFocus,
): string {
  if (!focus || focus.employeeId !== employeeId) return '';
  return 'bb-schedule-crosshair-name';
}

export function scheduleCrosshairColumnHeaderClass(
  date: string,
  focus: ScheduleGridFocus,
): string {
  if (!focus || focus.date !== date) return '';
  return 'bb-schedule-crosshair-col-h';
}
