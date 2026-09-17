/** Pure helpers for pruning duplicate Web Push rows on the same physical device. */

export type PushSubscriptionPruneRow = {
  id: string;
  endpoint: string;
  client_session_id: string | null;
};

/** Drop older endpoints that share the same stable client session id (Chrome + PWA double register). */
export function pushSubscriptionIdsToPruneForSession(
  rows: PushSubscriptionPruneRow[],
  keepEndpoint: string,
  clientSessionId: string | null | undefined,
): string[] {
  const sessionId = clientSessionId?.trim();
  const keep = keepEndpoint.trim();
  if (!sessionId || !keep) return [];

  const ids: string[] = [];
  for (const row of rows) {
    if (row.endpoint === keep) continue;
    if (row.client_session_id?.trim() !== sessionId) continue;
    ids.push(row.id);
  }
  return ids;
}
