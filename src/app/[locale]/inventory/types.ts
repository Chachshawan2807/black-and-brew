import type {
  InventoryRecommendationConfidence,
  InventoryShortageRisk,
} from '@/lib/inventory-recommended-target-stock';

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
  count_policy?: InventoryCountPolicy;
  shortage_risk?: InventoryShortageRisk;
  lead_time_days?: number;
  recommended_target_stock?: number;
  recommendation_confidence?: InventoryRecommendationConfidence;
  recommendation_explanation?: string[];
  updated_at?: string;
  [key: string]: string | number | string[] | undefined;
}

export type InventoryCountPolicy = 'exact_count' | 'sufficiency_check';

/** Value accepted by inventory cell editors and transient recommendation rows */
export type InventoryFieldValue = string | number | string[];

export type InventoryFieldHandler = (
  id: string,
  field: string,
  value: InventoryFieldValue
) => void;

export type InventoryFieldSaveHandler = (
  id: string,
  field: string,
  value: InventoryFieldValue
) => boolean | void | Promise<boolean | void>;

export interface InventoryCellBaseProps {
  item: InventoryItem;
  col: ColumnDef;
  rowIndex: number;
  handleUpdateField: InventoryFieldHandler;
  handleSaveField: InventoryFieldSaveHandler;
  handleFocus: () => void;
  requestDelete: (id: string) => void;
}

export interface InventoryRowHandlers extends InventoryCellBaseProps {
  getStockColorClass: (stock: number, orderPoint: number) => string;
}

export function readInventoryField(item: InventoryItem, fieldId: string): string | number {
  const record = item as Record<string, string | number | string[] | undefined>;
  const val = record[fieldId];
  if (val === undefined || val === null) return '';
  if (Array.isArray(val)) return '';
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
        const raw = typeof val === 'string' ? val.trim() : String(val);
        const match = raw.match(/^(\d+(?:\.\d+)?)(px)?$/);
        const numVal = match ? Number(match[1]) : NaN;
        if (typeof key === 'string' && !isNaN(numVal) && numVal > 0 && numVal < 2000) {
          safeWidths[key] = `${numVal}px`;
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
