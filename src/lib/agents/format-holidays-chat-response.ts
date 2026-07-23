import { buildBruReport, formatIsoDateDisplay } from '@/lib/agents/report-response';

export type HolidayRow = { date: string; name: string };

function daysUntil(isoDate: string, currentIsoDate: string): number {
  const a = new Date(`${currentIsoDate}T12:00:00`).getTime();
  const b = new Date(`${isoDate}T12:00:00`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function formatHolidaysChatResponse(
  currentIsoDate: string,
  holidays: HolidayRow[],
): string {
  const upcoming = holidays
    .filter((h) => h.date >= currentIsoDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (upcoming.length === 0) {
    return buildBruReport({
      header: '🎌 วันหยุดนักขัตฤกษ์ใกล้ๆ นี้',
      bullets: [],
      emptyMessage: 'ไม่พบวันหยุดนักขัตฤกษ์ในช่วงที่เหลือของปี',
    });
  }

  const bullets = upcoming.map((h) => {
    const days = daysUntil(h.date, currentIsoDate);
    const when = days === 0 ? 'วันนี้' : days === 1 ? 'พรุ่งนี้' : `อีก ${days} วัน`;
    return `${h.name} — ${formatIsoDateDisplay(h.date)} (${when})`;
  });

  return buildBruReport({
    header: '🎌 วันหยุดนักขัตฤกษ์ใกล้ๆ นี้',
    bullets,
    footerCount: { label: 'วันหยุดที่จะถึง', count: upcoming.length },
  });
}
