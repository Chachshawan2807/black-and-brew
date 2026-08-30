import { createHash } from 'node:crypto';

/** Stable hash for derived task upsert secretary boundary only. */
export function buildSourceRefHash(taskType: string, sourceRef: Record<string, unknown>): string {
  const payload = JSON.stringify({ taskType, sourceRef });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}
