export function isInventoryAccuracyQuery(text: string): boolean {
  return (
    /ความแม่นยำ|accuracy|discrepancy|รายงาน.*(นับ|ตรวจนับ)|ตรวจนับ.*(ผิด|คลาดเคลื่อน|แม่น)|inventory_count_verifications/i.test(
      text,
    )
  );
}
