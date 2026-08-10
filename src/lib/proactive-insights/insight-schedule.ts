/** Daily proactive insight digest is scheduled at 17:00 ICT (10:00 UTC). */
export const INSIGHT_DAILY_CRON_ICT_HOUR = 17;

export function resolveInsightCronOccurredAt(dateIso: string): string {
  return `${dateIso}T10:00:00.000Z`;
}
