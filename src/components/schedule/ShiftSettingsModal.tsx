'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Settings, RotateCcw, Loader2, Trash2, ChevronDown, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SHIFT_TYPES,
  PASTEL_COLOR_PRESETS,
  buildShiftDisplay,
  createNewShiftEntry,
  isDefaultShiftType,
  type ShiftTypeEntry,
} from '@/lib/shift-type-config';

const SELECT_NEW_CUSTOM = '__new_custom__';

interface ShiftSettingsModalProps {
  shiftTypes: ShiftTypeEntry[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (entries: ShiftTypeEntry[]) => void;
}

function CollapsibleColorPicker({
  entry,
  open,
  onToggle,
  onChange,
}: {
  entry: ShiftTypeEntry;
  open: boolean;
  onToggle: () => void;
  onChange: (bg: string, border: string) => void;
}) {
  const activePreset = PASTEL_COLOR_PRESETS.find(
    (p) => p.bg === entry.bgColor && p.border === entry.borderColor
  );

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2.5 h-11 px-3 rounded-xl border transition-all cursor-pointer',
          open
            ? 'border-emerald-500/30 bg-emerald-50/20'
            : 'border-border bg-background hover:bg-muted/30'
        )}
        aria-expanded={open}
      >
        <span
          className="h-6 w-6 rounded-full border-2 shrink-0 shadow-sm"
          style={{ backgroundColor: entry.bgColor, borderColor: entry.borderColor }}
        />
        <span className="flex-1 text-left text-[13px] text-foreground truncate">
          {activePreset?.name ?? 'สีพาสเทล'}
        </span>
        <Palette className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
        <ChevronDown
          className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="mt-2 p-3 rounded-xl border border-border bg-muted/15 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5 px-0.5">
            เลือกสีพาสเทล
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {PASTEL_COLOR_PRESETS.map((preset) => {
              const selected = entry.bgColor === preset.bg && entry.borderColor === preset.border;
              return (
                <button
                  key={`${preset.bg}-${preset.border}`}
                  type="button"
                  title={preset.name}
                  onClick={() => onChange(preset.bg, preset.border)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all active:scale-95 cursor-pointer',
                    selected
                      ? 'border-emerald-500/50 bg-card shadow-sm ring-1 ring-emerald-500/20'
                      : 'border-transparent hover:border-border hover:bg-card/80'
                  )}
                >
                  <span
                    className="h-8 w-8 rounded-full border-2"
                    style={{ backgroundColor: preset.bg, borderColor: preset.border }}
                  />
                  <span className="text-[10px] text-muted-foreground leading-none">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShiftSettingsModal({
  shiftTypes,
  isSaving,
  onClose,
  onSave,
}: ShiftSettingsModalProps) {
  const [draft, setDraft] = useState<ShiftTypeEntry[]>(() =>
    shiftTypes.map((t) => ({ ...t }))
  );
  const [selectedId, setSelectedId] = useState<string>(() => draft[0]?.id ?? '');
  const [selectValue, setSelectValue] = useState<string>(() => draft[0]?.id ?? '');
  const [customName, setCustomName] = useState('');
  const [colorOpen, setColorOpen] = useState(false);

  const selectedEntry = useMemo(
    () => draft.find((t) => t.id === selectedId) ?? draft[0],
    [draft, selectedId]
  );

  const preview = selectedEntry ? buildShiftDisplay(selectedEntry) : null;

  useEffect(() => {
    if (!draft.some((t) => t.id === selectedId) && draft[0]) {
      setSelectedId(draft[0].id);
      setSelectValue(draft[0].id);
    }
  }, [draft, selectedId]);

  useEffect(() => {
    setColorOpen(false);
  }, [selectedId]);

  const updateEntry = (updated: ShiftTypeEntry) => {
    setDraft((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleSelectChange = (value: string) => {
    setSelectValue(value);

    if (value === SELECT_NEW_CUSTOM) {
      setCustomName('');
      return;
    }

    setSelectedId(value);
  };

  const handleCustomNameSubmit = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;

    const existing = draft.find((t) => t.value === trimmed);
    if (existing) {
      setSelectedId(existing.id);
      setSelectValue(existing.id);
      setCustomName('');
      return;
    }

    const base = createNewShiftEntry(draft);
    const named: ShiftTypeEntry = { ...base, label: trimmed, value: trimmed };
    setDraft((prev) => [...prev, named]);
    setSelectedId(named.id);
    setSelectValue(named.id);
    setCustomName('');
  };

  const handleRemoveShift = (id: string) => {
    if (draft.length <= 1) return;
    const next = draft.filter((t) => t.id !== id);
    setDraft(next);
    const fallback = next[0];
    if (fallback) {
      setSelectedId(fallback.id);
      setSelectValue(fallback.id);
    }
  };

  const handleReset = () => {
    const reset = DEFAULT_SHIFT_TYPES.map((t) => ({ ...t }));
    setDraft(reset);
    setSelectedId(reset[0]?.id ?? '');
    setSelectValue(reset[0]?.id ?? '');
    setCustomName('');
    setColorOpen(false);
  };

  const handleSave = () => {
    const cleaned = draft
      .map((t) => ({
        ...t,
        label: t.label.trim(),
        value: t.label.trim() || t.value,
      }))
      .filter((t) => t.label && t.value);

    if (cleaned.length === 0) return;
    onSave(cleaned);
  };

  const isCreating = selectValue === SELECT_NEW_CUSTOM;
  const canDelete = selectedEntry && !isDefaultShiftType(selectedEntry.id) && !isCreating;

  return (
    <div
      className="fixed inset-0 bg-[#000000]/30 backdrop-blur-sm bb-modal-backdrop z-[75] flex items-end justify-center md:items-center p-0 md:p-4 animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="relative rounded-t-[32px] md:rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden bg-card shadow-2xl bb-modal-panel flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start gap-3 shrink-0">
          <div className="p-2 bg-muted/50 rounded-2xl mt-0.5">
            <Settings className="w-5 h-5 text-foreground" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-normal text-foreground tracking-tight">ตั้งค่ากะการทำงาน</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
              เลือกกะ ปรับสีพาสเทล หรือกำหนดกะใหม่
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-2 -mr-1 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main editor */}
        <div className="px-5 pb-5 space-y-3 shrink-0">
          {/* Row: preview + เลือกกะ */}
          <div className="flex items-end gap-2.5">
            {preview && selectedEntry && !isCreating && (
              <div
                className={cn(
                  'h-11 w-[76px] shrink-0 rounded-xl border flex items-center justify-center text-[13px] font-normal truncate px-1.5',
                  preview.className
                )}
                style={preview.style}
                title="ตัวอย่าง"
              >
                {selectedEntry.label}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest px-0.5 mb-1 block">
                เลือกกะ
              </label>
              <div className="relative">
                <select
                  value={selectValue}
                  onChange={(e) => handleSelectChange(e.target.value)}
                  className="w-full h-11 pl-3 pr-9 rounded-xl border border-border bg-background text-[14px] text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {draft.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                  <option value={SELECT_NEW_CUSTOM}>กำหนดเอง...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {canDelete && (
              <button
                type="button"
                onClick={() => handleRemoveShift(selectedEntry!.id)}
                disabled={isSaving || draft.length <= 1}
                className="shrink-0 flex items-center justify-center h-11 w-11 mb-0 text-red-500/80 hover:text-red-600 hover:bg-red-50 rounded-xl border border-border transition-all disabled:opacity-50 cursor-pointer"
                title="ลบกะนี้"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Custom name input when กำหนดเอง */}
          {isCreating && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                type="text"
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomNameSubmit()}
                className="flex-1 h-11 px-3 rounded-xl border border-border bg-background text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="พิมพ์ชื่อกะใหม่"
              />
              <button
                type="button"
                onClick={handleCustomNameSubmit}
                disabled={!customName.trim()}
                className="h-11 px-4 text-[13px] text-[#ffffff] bg-[#000000] hover:bg-[#000000]/85 rounded-xl transition-all disabled:opacity-40 cursor-pointer shrink-0"
              >
                เพิ่ม
              </button>
            </div>
          )}

          {/* Collapsible color picker */}
          {selectedEntry && !isCreating && (
            <CollapsibleColorPicker
              entry={selectedEntry}
              open={colorOpen}
              onToggle={() => setColorOpen((v) => !v)}
              onChange={(bg, border) =>
                updateEntry({ ...selectedEntry, bgColor: bg, borderColor: border })
              }
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex flex-col gap-2 shrink-0 max-md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center justify-center gap-1.5 h-10 text-[12px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            คืนค่าเริ่มต้น
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 h-11 px-4 text-[13px] text-foreground bg-card hover:bg-muted/30 rounded-3xl border border-border transition-all disabled:opacity-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isCreating}
              className="flex-1 h-11 px-4 text-[13px] text-[#ffffff] bg-[#000000] hover:bg-[#000000]/85 rounded-3xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
