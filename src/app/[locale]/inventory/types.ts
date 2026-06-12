export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  order_qty: number;
  order_point: number;
  target_stock: number;
  unit: string;
  source: string;
  sort_order: number;
  updated_at?: string;
  [key: string]: string | number | undefined;
}

/** Value accepted by inventory cell editors and save handlers */
export type InventoryFieldValue = string | number;

export type InventoryFieldHandler = (
  id: string,
  field: string,
  value: InventoryFieldValue
) => void;

export interface InventoryCellBaseProps {
  item: InventoryItem;
  col: ColumnDef;
  rowIndex: number;
  handleUpdateField: InventoryFieldHandler;
  handleSaveField: (id: string, field: string, value: InventoryFieldValue) => void | Promise<void>;
  handleFocus: () => void;
  requestDelete: (id: string) => void;
}

export interface InventoryRowHandlers extends InventoryCellBaseProps {
  getStockColorClass: (stock: number, targetStock: number) => string;
}

export function readInventoryField(item: InventoryItem, fieldId: string): string | number {
  const record = item as Record<string, string | number | undefined>;
  const val = record[fieldId];
  if (val === undefined || val === null) return '';
  return val;
}

export interface ColumnDef {
  id: string;
  label: string;
  width: string;
  type: 'text' | 'number';
}

export type NumericFormValue = number | string;

export type NewItemFormData = Partial<Omit<InventoryItem, 'stock' | 'order_qty' | 'order_point' | 'target_stock'>> & {
  stock?: NumericFormValue;
  order_qty?: NumericFormValue;
  order_point?: NumericFormValue;
  target_stock?: NumericFormValue;
};

export type ColumnSettings = {
  order: string[];
  labels: Record<string, string>;
  widths?: Record<string, string>;
} | null;

export const defaultColumns: ColumnDef[] = [
  { id: 'sort_order', label: 'ลำดับ', width: '60px', type: 'number' },
  { id: 'name', label: 'ชื่อรายการ', width: '220px', type: 'text' },
  { id: 'stock', label: 'คงเหลือ', width: '80px', type: 'number' },
  { id: 'order_qty', label: 'จำนวนสั่งซื้อ', width: '100px', type: 'number' },
  { id: 'order_point', label: 'จุดสั่งซื้อ', width: '100px', type: 'number' },
  { id: 'target_stock', label: 'จำนวนที่ต้องมี', width: '120px', type: 'number' },
  { id: 'unit', label: 'หน่วย', width: '80px', type: 'text' },
  { id: 'source', label: 'ช่องทางสั่งซื้อ', width: '160px', type: 'text' },
];

export function formatNumericFormValue(value: NumericFormValue | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
}

export function parseNumericFormValue(value: NumericFormValue | null | undefined): number {
  if (value === '' || value === null || value === undefined) return 0;
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

export function buildColumnsFromSettings(
  settings: ColumnSettings | undefined,
  localWidths: Record<string, string> = {},
): ColumnDef[] {
  if (!settings?.order || !settings?.labels) return defaultColumns;

  const newCols = settings.order
    .map((id: string) => {
      const def = defaultColumns.find(c => c.id === id);
      return def
        ? {
            ...def,
            label: settings.labels[id] || def.label,
            width: localWidths[id] || settings.widths?.[id] || def.width,
          }
        : null;
    })
    .filter(Boolean) as ColumnDef[];

  return newCols.length > 0 ? newCols : defaultColumns;
}

export function parseLocalColumnWidths(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const savedWidths = localStorage.getItem('inventory-column-widths');
  if (!savedWidths) return {};

  try {
    const widths = JSON.parse(savedWidths);
    if (widths && typeof widths === 'object' && !Array.isArray(widths)) {
      const safeWidths: Record<string, string> = {};
      Object.entries(widths).forEach(([key, val]) => {
        const numVal = Number(val);
        if (typeof key === 'string' && !isNaN(numVal) && numVal > 0 && numVal < 2000) {
          safeWidths[key] = String(numVal);
        }
      });
      return safeWidths;
    }
  } catch (e) {
    console.error('Failed to parse saved widths:', e);
    localStorage.removeItem('inventory-column-widths');
  }

  return {};
}
