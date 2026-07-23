export function isBeanOrdersSummaryQuery(text: string): boolean {
  return (
    /คำสั่งซื้อเมล็ด|ออเดอร์เมล็ด|bean.?order|เมล็ดกาแฟ.*(สั่ง|ออเดอร์|ค้าง|จัดส่ง)|ค้างชำระ|รอจัดส่ง/i.test(
      text,
    )
  );
}
