/** Daily proactive insight digest is scheduled at 07:00 ICT (00:00 UTC). */
export const INSIGHT_DAILY_CRON_ICT_HOUR = 7;

export function resolveInsightCronOccurredAt(dateIso: string): string {
  return `${dateIso}T00:00:00.000Z`;
}
