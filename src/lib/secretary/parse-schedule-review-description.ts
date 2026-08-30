export type ScheduleReviewEntry = {
  dayLabel: string;
  detail: string;
};

/** Parses grouped schedule review lines (e.g. "พ. ที่ 2 (4 คน), ศ. ที่ 24 (เอ, บี)"). */
export function parseScheduleReviewDescription(text: string): ScheduleReviewEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const groupedPattern = /([^,]+?\sที่\s\d+)\s*\(([^)]+)\)/g;
  const grouped: ScheduleReviewEntry[] = [];
  let match: RegExpExecArray | null = groupedPattern.exec(trimmed);
  while (match) {
    grouped.push({ dayLabel: match[1]!.trim(), detail: match[2]!.trim() });
    match = groupedPattern.exec(trimmed);
  }
  if (grouped.length > 0) return grouped;

  return trimmed.split(',').map((segment) => {
    const part = segment.trim();
    const legacy = part.match(/^(.+?\s\d+)\s+(.+)$/);
    if (legacy) {
      return { dayLabel: legacy[1]!.trim(), detail: legacy[2]!.trim() };
    }

    return { dayLabel: part, detail: '' };
  });
}
