/**
 * Accessibility helpers for inventory spreadsheet grid cells.
 */
export function getInventoryCellAriaLabel(itemName: string, colLabel: string): string {
  const trimmedName = itemName.trim();
  if (!trimmedName) return colLabel;
  return `${colLabel} ${trimmedName}`;
}

export function getInventoryCellInputName(itemId: string, colId: string): string {
  return `inventory-${itemId}-${colId}`;
}
