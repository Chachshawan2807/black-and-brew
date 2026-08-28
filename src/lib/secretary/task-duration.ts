
export function computeSessionTiming(
  startedAt: string,
  endedAt: string,
): { durationSeconds: number; durationMinutes: number } {
  const startedMs = Date.parse(startedAt);
  const endedMs = Date.parse(endedAt);
  if (Number.isNaN(startedMs) || Number.isNaN(endedMs) || endedMs <= startedMs) {
    return { durationSeconds: 1, durationMinutes: 0.1 };
  }

  const durationSeconds = Math.max(1, Math.floor((endedMs - startedMs) / 1000));
  const durationMinutes = Math.round((durationSeconds / 60) * 10) / 10;
  return { durationSeconds, durationMinutes };
}

export function sessionDurationMinutes(startedAt: string, endedAt: string): number {
  return computeSessionTiming(startedAt, endedAt).durationMinutes;
}

export function resolveTaskActualDurationSeconds(
  metadata: Record<string, unknown> | null | undefined,
): number | null {
  if (!metadata) return null;
  const total = Number(metadata.totalActualSeconds);
  if (Number.isFinite(total) && total > 0) return Math.round(total);
  const last = Number(metadata.lastActualSeconds);
  if (Number.isFinite(last) && last > 0) return Math.round(last);
  return null;
}

export function formatTaskDurationDisplay(totalSeconds: number): string {
  const seconds = Math.max(1, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} วินาที`;

  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  if (minutes < 60) {
    return remainderSeconds > 0 ? `${minutes} นาที ${remainderSeconds} วินาที` : `${minutes} นาที`;
  }

  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  return remainderMinutes > 0 ? `${hours} ชม. ${remainderMinutes} นาที` : `${hours} ชม.`;
}

export function formatTaskActualDurationLabel(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const seconds = resolveTaskActualDurationSeconds(metadata);
  if (seconds === null) return null;
  return `ใช้เวลา ${formatTaskDurationDisplay(seconds)}`;
}
