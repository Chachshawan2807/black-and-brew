/** Central shift-type definitions — synced with schedule UI and shift-colors lookups */

export const SHIFT_TYPES_STORAGE_KEY = 'blackandbrew-shift-types';
export const SHIFT_TYPES_UPDATED_EVENT = 'bb-shift-types-updated';

export interface ShiftTypeEntry {
  /** Stable identifier — never changes when renaming */
  id: string;
  /** Display name (also stored in shifts.metadata.location) */
  label: string;
  /** DB value in metadata.location — kept in sync with label on save */
  value: string;
  bgColor: string;
  borderColor: string;
  /** Include in FOH headcount row (6:30 / 7:00 / 8:00 style shifts) */
  fohCount?: boolean;
  /** Legacy aliases for lookup (e.g. 06:30 → 6:30) */
  aliases?: string[];
}

export interface ShiftTypeDisplay extends ShiftTypeEntry {
  className: string;
  style: { backgroundColor: string; borderColor: string; color: string };
}

/** Suggested shift names for the settings dropdown */
export const SHIFT_NAME_PRESETS = [
  '6:30',
  '7:00',
  '8:00',
  '9:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  'ร้านซักผ้า',
  'ไปสาขา 2',
  'ลา',
  'วันหยุด',
] as const;

export const SHIFT_NAME_CUSTOM = '__custom__';

export const PASTEL_COLOR_PRESETS: ReadonlyArray<{
  name: string;
  bg: string;
  border: string;
}> = [
  { name: 'เขียวอ่อน', bg: '#d4edda', border: '#c3e6cb' },
  { name: 'ขาว', bg: '#ffffff', border: '#d1d5db' },
  { name: 'เหลืองอ่อน', bg: '#fff3cd', border: '#ffeeba' },
  { name: 'ฟ้าอ่อน', bg: '#d1ecf1', border: '#bee5eb' },
  { name: 'ชมพูอ่อน', bg: '#f8d7da', border: '#f5c6cb' },
  { name: 'ม่วงอ่อน', bg: '#f3e8ff', border: '#d8b4fe' },
  { name: 'น้ำเงินอ่อน', bg: '#e6f0ff', border: '#c2d6ff' },
  { name: 'ส้มอ่อน', bg: '#ffe8d6', border: '#ffd0a8' },
] as const;

export const DEFAULT_SHIFT_TYPES: ShiftTypeEntry[] = [
  {
    id: 'type-630',
    label: '6:30',
    value: '6:30',
    bgColor: '#d4edda',
    borderColor: '#c3e6cb',
    fohCount: true,
    aliases: ['06:30'],
  },
  {
    id: 'type-700',
    label: '7:00',
    value: '7:00',
    bgColor: '#ffffff',
    borderColor: '#d1d5db',
    fohCount: true,
    aliases: ['07:00'],
  },
  {
    id: 'type-800',
    label: '8:00',
    value: '8:00',
    bgColor: '#fff3cd',
    borderColor: '#ffeeba',
    fohCount: true,
    aliases: ['08:00'],
  },
  {
    id: 'type-laundry',
    label: 'ร้านซักผ้า',
    value: 'ร้านซักผ้า',
    bgColor: '#d1ecf1',
    borderColor: '#bee5eb',
  },
  {
    id: 'type-branch2',
    label: 'ไปสาขา 2',
    value: 'ไปสาขา 2',
    bgColor: '#d1ecf1',
    borderColor: '#bee5eb',
  },
  {
    id: 'type-leave',
    label: 'ลา',
    value: 'ลา',
    bgColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
];

const DEFAULT_BY_ID = new Map(DEFAULT_SHIFT_TYPES.map((t) => [t.id, t]));

export function buildShiftDisplay(entry: ShiftTypeEntry): ShiftTypeDisplay {
  return {
    ...entry,
    className: 'bb-pastel-surface border text-[#000000]',
    style: {
      backgroundColor: entry.bgColor,
      borderColor: entry.borderColor,
      color: '#000000',
    },
  };
}

export function toDisplayList(entries: ShiftTypeEntry[]): ShiftTypeDisplay[] {
  return entries.map(buildShiftDisplay);
}

export function normalizeShiftTypes(raw: unknown): ShiftTypeEntry[] {
  if (!Array.isArray(raw)) return [...DEFAULT_SHIFT_TYPES];

  const result: ShiftTypeEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<ShiftTypeEntry>;
    const fallback = row.id ? DEFAULT_BY_ID.get(row.id) : undefined;

    const label = typeof row.label === 'string' ? row.label.trim() : fallback?.label;
    const value = typeof row.value === 'string' ? row.value.trim() : label;
    const id = typeof row.id === 'string' ? row.id : fallback?.id;

    if (!id || !label || !value) continue;

    const bgColor =
      typeof row.bgColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(row.bgColor)
        ? row.bgColor
        : fallback?.bgColor ?? '#ffffff';
    const borderColor =
      typeof row.borderColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(row.borderColor)
        ? row.borderColor
        : fallback?.borderColor ?? '#d1d5db';

    result.push({
      id,
      label,
      value,
      bgColor,
      borderColor,
      fohCount: row.fohCount ?? fallback?.fohCount,
      aliases: Array.isArray(row.aliases)
        ? row.aliases.filter((a): a is string => typeof a === 'string')
        : fallback?.aliases,
    });
  }

  if (result.length === 0) return [...DEFAULT_SHIFT_TYPES];

  const savedById = new Map(result.map((t) => [t.id, t]));
  const defaults = DEFAULT_SHIFT_TYPES.map((def) => savedById.get(def.id) ?? { ...def });
  const custom = result.filter((t) => !DEFAULT_BY_ID.has(t.id));

  return [...defaults, ...custom];
}

export function isDefaultShiftType(id: string): boolean {
  return DEFAULT_BY_ID.has(id);
}

export function createNewShiftEntry(existing: ShiftTypeEntry[]): ShiftTypeEntry {
  const preset = PASTEL_COLOR_PRESETS[existing.length % PASTEL_COLOR_PRESETS.length];
  const baseName = 'กะใหม่';
  let label = baseName;
  let n = 2;
  const used = new Set(existing.map((t) => t.value));
  while (used.has(label)) {
    label = `${baseName} ${n}`;
    n += 1;
  }

  return {
    id: `type-custom-${Date.now()}`,
    label,
    value: label,
    bgColor: preset.bg,
    borderColor: preset.border,
  };
}

export function resolveShiftNamePreset(label: string): string {
  const trimmed = label.trim();
  if (SHIFT_NAME_PRESETS.includes(trimmed as (typeof SHIFT_NAME_PRESETS)[number])) {
    return trimmed;
  }
  return SHIFT_NAME_CUSTOM;
}

let clientCache: ShiftTypeEntry[] | null = null;

export function getClientShiftTypes(): ShiftTypeEntry[] {
  if (clientCache) return clientCache;
  if (typeof window === 'undefined') return [...DEFAULT_SHIFT_TYPES];

  try {
    const saved = localStorage.getItem(SHIFT_TYPES_STORAGE_KEY);
    if (saved) {
      clientCache = normalizeShiftTypes(JSON.parse(saved));
      return clientCache;
    }
  } catch {
    localStorage.removeItem(SHIFT_TYPES_STORAGE_KEY);
  }

  clientCache = [...DEFAULT_SHIFT_TYPES];
  return clientCache;
}

export function loadShiftTypesFromStorage(): ShiftTypeDisplay[] {
  return toDisplayList(getClientShiftTypes());
}

export function saveShiftTypesToStorage(entries: ShiftTypeEntry[]): ShiftTypeDisplay[] {
  const normalized = normalizeShiftTypes(entries);
  clientCache = normalized;

  if (typeof window !== 'undefined') {
    localStorage.setItem(SHIFT_TYPES_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(SHIFT_TYPES_UPDATED_EVENT));
  }

  return toDisplayList(normalized);
}

export function resetShiftTypesCache(): void {
  clientCache = null;
}

export function findShiftTypeByLocation(
  location: string,
  types: ShiftTypeEntry[] = getClientShiftTypes()
): ShiftTypeEntry | undefined {
  const loc = location.replace(/^เข้ากะ\s*/, '').trim();
  if (!loc) return undefined;

  const direct = types.find((t) => t.value === loc || t.aliases?.includes(loc));
  if (direct) return direct;

  if (loc.includes('ซักผ้า') || loc.includes('สาขา')) {
    return types.find((t) => t.id === 'type-laundry' || t.id === 'type-branch2');
  }

  return undefined;
}

export function getFohCountValues(types: ShiftTypeEntry[] = getClientShiftTypes()): string[] {
  return types.filter((t) => t.fohCount).map((t) => t.value);
}

export function collectShiftRenames(
  previous: ShiftTypeEntry[],
  next: ShiftTypeEntry[]
): Array<{ oldValue: string; newValue: string }> {
  const renames: Array<{ oldValue: string; newValue: string }> = [];

  for (const n of next) {
    const prev = previous.find((p) => p.id === n.id);
    if (!prev) continue;
    if (prev.value !== n.value && prev.value.trim() && n.value.trim()) {
      renames.push({ oldValue: prev.value, newValue: n.value });
    }
  }

  return renames;
}
