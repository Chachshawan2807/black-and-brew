/** Format: BO-YYYYMMDD-N (N = daily sequence, 1-based, no leading zeros) */
export function formatBeanOrderNo(date: Date, dailySequence: number): string {
  const seq = String(Math.max(1, dailySequence));
  return `${buildBeanOrderNoDatePrefix(date)}-${seq}`;
}

export function buildBeanOrderNoDatePrefix(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `BO-${y}${m}${d}`;
}

export function parseBeanOrderNoSequence(orderNo: string): number | null {
  const match = /^BO-\d{8}-(\d+)$/.exec(orderNo);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export function maxBeanOrderSequence(orderNos: Iterable<string>): number {
  let max = 0;
  for (const orderNo of orderNos) {
    const seq = parseBeanOrderNoSequence(orderNo);
    if (seq != null && seq > max) max = seq;
  }
  return max;
}

export function nextBeanOrderSequence(existingMaxOrderNo: string | null): number {
  if (!existingMaxOrderNo) return 1;
  const seq = parseBeanOrderNoSequence(existingMaxOrderNo);
  return (seq ?? 0) + 1;
}

export function parseBeanOrderNoDatePrefix(orderNo: string): string | null {
  const match = /^BO-(\d{8})-\d+$/.exec(orderNo);
  return match?.[1] ?? null;
}
