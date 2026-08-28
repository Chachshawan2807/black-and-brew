/** Daily secretary digest is scheduled at 08:00 ICT (01:00 UTC). */
export const SECRETARY_DAILY_CRON_ICT_HOUR = 8;

export function resolveSecretaryCronOccurredAt(dateIso: string): string {
  return `${dateIso}T01:00:00.000Z`;
}
