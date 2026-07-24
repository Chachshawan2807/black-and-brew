/** Format: BO-YYYYMMDD-XXX (XXX = daily sequence, 1-based, zero-padded) */
export function formatBeanOrderNo(date: Date, dailySequence: number): string {
  const seq = String(Math.max(1, dailySequence)).padStart(3, '0');
  return `${buildBeanOrderNoDatePrefix(date)}-${seq}`;
}

export function buildBeanOrderNoDatePrefix(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `BO-${y}${m}${d}`;
}

export function parseBeanOrderNoSequence(orderNo: string): number | null {
  const match = /^BO-\d{8}-(\d{3})$/.exec(orderNo);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export function nextBeanOrderSequence(existingMaxOrderNo: string | null): number {
  if (!existingMaxOrderNo) return 1;
  const seq = parseBeanOrderNoSequence(existingMaxOrderNo);
  return (seq ?? 0) + 1;
}

export function parseBeanOrderNoDatePrefix(orderNo: string): string | null {
  const match = /^BO-(\d{8})-\d{3}$/.exec(orderNo);
  return match?.[1] ?? null;
}
