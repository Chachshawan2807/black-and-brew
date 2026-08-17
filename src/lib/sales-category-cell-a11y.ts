export function getSalesCategoryCellAriaLabel(productName: string): string {
  return `หมวดหมู่ ${productName}`;
}

export function getSalesCategoryInputName(productName: string): string {
  return `sales-category-${productName}`;
}

export function getSalesCategoryEditButtonAriaLabel(productName: string, category: string): string {
  const display = category.trim() || 'ยังไม่ระบุ';
  return `แก้ไขหมวดหมู่ ${productName} (${display})`;
}

export function getSalesCategorySaveAriaLabel(productName: string): string {
  return `บันทึกหมวดหมู่ ${productName}`;
}

export function getSalesCategoryCancelAriaLabel(productName: string): string {
  return `ยกเลิกแก้ไขหมวดหมู่ ${productName}`;
}
