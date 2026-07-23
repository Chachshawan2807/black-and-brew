export function isSalesSummaryQuery(text: string): boolean {
  if (/ตารางงาน|กะงาน|ซ่อม|บำรุง|เมล็ดกาแฟ|bean.?order/i.test(text)) return false;
  return /ยอดขาย|sales|revenue|ขายดี|best.?seller|รายได้/i.test(text);
}

export function resolveSalesDateRange(
  text: string,
  currentIsoDate: string,
): { fromDate: string; toDate: string } {
  const base = new Date(`${currentIsoDate}T12:00:00`);

  if (/วันนี้|today/i.test(text)) {
    return { fromDate: currentIsoDate, toDate: currentIsoDate };
  }

  if (/เมื่อวาน|yesterday/i.test(text)) {
    const d = new Date(base);
    d.setDate(d.getDate() - 1);
    const iso = d.toISOString().slice(0, 10);
    return { fromDate: iso, toDate: iso };
  }

  if (/เดือนนี้|this.?month/i.test(text)) {
    const fromDate = `${currentIsoDate.slice(0, 7)}-01`;
    return { fromDate, toDate: currentIsoDate };
  }

  // Default: last 7 days including today
  const from = new Date(base);
  from.setDate(from.getDate() - 6);
  return { fromDate: from.toISOString().slice(0, 10), toDate: currentIsoDate };
}
