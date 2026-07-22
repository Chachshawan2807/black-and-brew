/** Format: BO-YYYYMMDD-XXX (XXX = daily sequence, 1-based, zero-padded) */
export function formatBeanOrderNo(date: Date, dailySequence: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(Math.max(1, dailySequence)).padStart(3, '0');
  return `BO-${y}${m}${d}-${seq}`;
}

export function parseBeanOrderNoDatePrefix(orderNo: string): string | null {
  const match = /^BO-(\d{8})-\d{3}$/.exec(orderNo);
  return match?.[1] ?? null;
}
