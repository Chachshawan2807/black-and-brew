/** Sidebar menu labels from `getMenuList` (keep in sync when adding routes). */
export const SIDEBAR_MENU_LABELS = [
  'หน้าหลัก',
  'งาน',
  'แดชบอร์ดพนักงาน',
  'ตารางงาน',
  'บันทึกการซ่อม',
  'คลังสินค้า',
  'ตรวจนับคลังสินค้า',
  'รายงานความแม่นยำ',
  'เบิกของสาขา 2',
  'ออเดอร์เมล็ดกาแฟ',
] as const;

export function isSidebarMenuLabel(text: string): boolean {
  const normalized = text.trim();
  return SIDEBAR_MENU_LABELS.some((label) => label === normalized);
}

/** Hide in-page titles that repeat the active sidebar label. */
export function shouldShowPageTitle(text: string): boolean {
  return !isSidebarMenuLabel(text);
}
