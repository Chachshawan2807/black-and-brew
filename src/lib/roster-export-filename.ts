const UNSAFE_FILENAME_CHARS = /[/\\?%*:|"<>]/g;

export function sanitizeRosterExportEmployeeName(name: string): string {
  const trimmed = name.trim().replace(UNSAFE_FILENAME_CHARS, '').replace(/\s+/g, '-');
  return trimmed || 'employee';
}

export function buildRosterIndividualExportFilename(
  employeeName: string,
  startDate: string,
  endDate: string,
): string {
  const safeName = sanitizeRosterExportEmployeeName(employeeName);
  return `Roster-Individual-${safeName}-${startDate}-${endDate}.png`;
}
