export function isLowStockQuery(text: string): boolean {
  if (/ความแม่นยำ|accuracy|bean.?order|เมล็ดกาแฟ.*ออเดอร์/i.test(text)) return false;
  return (
    /สต็อก.*(ต่ำ|น้อย|หมด|ขาด)|ต่ำกว่าจุดสั่งซื้อ|ต้องสั่งเติม|low.?stock|รายการสั่งซื้อ/i.test(
      text,
    )
  );
}
