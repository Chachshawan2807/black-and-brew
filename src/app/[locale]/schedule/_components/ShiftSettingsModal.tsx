'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import React, { useEffect, useMemo, useState } from 'react';
import { Settings, RotateCcw, Trash2 } from '@/lib/icons';
import { RoundedSelect } from '@/components/ui/rounded-select';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SHIFT_TYPES,
  PASTEL_COLOR_PRESETS,
  buildShiftDisplay,
  createNewShiftEntry,
  type ShiftTypeEntry,
} from '@/lib/shift-type-config';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { APP_MODAL_ABOVE_FAB_Z_INDEX } from '@/lib/floating-action-layout';
import {
  SCHEDULE_BTN_GHOST,
  SCHEDULE_BTN_PRIMARY,
  SCHEDULE_BTN_SECONDARY,
  SCHEDULE_FIELD_INPUT,
  SCHEDULE_FORM_LABEL,
  SCHEDULE_MODAL_OVERLAY,
  SCHEDULE_MODAL_PANEL,
  ScheduleModalHeader,
} from './schedule-ui-primitives';

const SELECT_NEW_CUSTOM = '__new_custom__';

interface ShiftSettingsModalProps {
  open: boolean;
  shiftTypes: ShiftTypeEntry[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (entries: ShiftTypeEntry[]) => void;
}

function ColorPickerButton({
  entry,
  open,
  onToggle,
}: {
  entry: ShiftTypeEntry;
  open: boolean;
  onToggle: () => void;
}) {
  const activePreset = PASTEL_COLOR_PRESETS.find(
    (p) => p.bg === entry.bgColor && p.border === entry.borderColor,
  );

  const colorLabel = activePreset?.name ?? 'สีพาสเทล';

  return (
    <HintTooltip tip={colorLabel}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border bb-transition cursor-pointer',
          open
            ? 'border-foreground/20 bg-muted/40'
            : 'border-border bg-background hover:bg-muted/30',
        )}
        aria-expanded={open}
        aria-label={colorLabel}
      >
        <span
          className="h-7 w-7 rounded-full border-2 shadow-sm"
          style={{ backgroundColor: entry.bgColor, borderColor: entry.borderColor }}
        />
      </button>
    </HintTooltip>
  );
}

function ColorPickerPanel({
  entry,
  onChange,
}: {
  entry: ShiftTypeEntry;
  onChange: (bg: string, border: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/15 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <p className={cn(SCHEDULE_FORM_LABEL, 'mb-2.5')}>เลือกสีพาสเทล</p>
      <div className="grid grid-cols-4 gap-2.5">
        {PASTEL_COLOR_PRESETS.map((preset) => {
          const selected = entry.bgColor === preset.bg && entry.borderColor === preset.border;
          return (
            <HintTooltip key={`${preset.bg}-${preset.border}`} tip={preset.name}>
              <button
                type="button"
                onClick={() => onChange(preset.bg, preset.border)}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-2 bb-transition active:scale-95',
                  selected
                    ? 'border-foreground/25 bg-card shadow-sm ring-1 ring-foreground/10'
                    : 'border-transparent hover:border-border hover:bg-card/80',
                )}
                aria-label={preset.name}
              >
                <span
                  className="h-8 w-8 rounded-full border-2"
                  style={{ backgroundColor: preset.bg, borderColor: preset.border }}
                />
                <span className="text-[10px] leading-none text-muted-foreground">{preset.name}</span>
              </button>
            </HintTooltip>
          );
        })}
      </div>
    </div>
  );
}

export default function ShiftSettingsModal({
  open,
  shiftTypes,
  isSaving,
  onClose,
  onSave,
}: ShiftSettingsModalProps) {
  const [draft, setDraft] = useState<ShiftTypeEntry[]>(() =>
    shiftTypes.map((t) => ({ ...t })),
  );
  const [selectedId, setSelectedId] = useState<string>(() => draft[0]?.id ?? '');
  const [selectValue, setSelectValue] = useState<string>(() => draft[0]?.id ?? '');
  const [customName, setCustomName] = useState('');
  const [colorOpen, setColorOpen] = useState(false);

  const selectedEntry = useMemo(
    () => draft.find((t) => t.id === selectedId) ?? draft[0],
    [draft, selectedId],
  );

  const preview = selectedEntry ? buildShiftDisplay(selectedEntry) : null;

  useEffect(() => {
    if (!draft.some((t) => t.id === selectedId) && draft[0]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keep selection valid when draft changes
      setSelectedId(draft[0].id);
      setSelectValue(draft[0].id);
    }
  }, [draft, selectedId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset color picker when shift selection changes
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
  const canDelete = Boolean(selectedEntry && !isCreating && draft.length > 1);

  return (
    <ModalPortal>
      <FadeModalScaffold
        open={open}
        onClose={() => {
          if (!isSaving) onClose();
        }}
        zIndex={APP_MODAL_ABOVE_FAB_Z_INDEX}
        overlayClassName={SCHEDULE_MODAL_OVERLAY}
        panelClassName={cn(
          SCHEDULE_MODAL_PANEL,
          'md:w-fit md:max-w-[22rem] max-w-[calc(100vw-2rem)] max-h-[90vh]',
        )}
        aria-label="ตั้งค่ากะการทำงาน"
      >
        <ScheduleModalHeader
          icon={<Settings className="h-5 w-5" strokeWidth={1.5} />}
          title="ตั้งค่ากะการทำงาน"
          subtitle="เลือกกะ ปรับสีพาสเทล หรือกำหนดกะใหม่"
          tone="settings"
          onClose={onClose}
          closeDisabled={isSaving}
          closeLabel="ปิดตั้งค่ากะ"
        />

        <div className="min-h-0 flex-1 shrink-0 space-y-3 overflow-y-auto px-5 pb-5 bb-smooth-scroll">
          <div className="space-y-2">
            <div className="flex items-end gap-2.5">
              <div className="w-[124px] shrink-0">
                <label className={cn(SCHEDULE_FORM_LABEL, 'mb-1')}>เลือกกะ</label>
                <RoundedSelect
                  value={selectValue}
                  onChange={(e) => handleSelectChange(e.target.value)}
                  wrapperClassName="w-full"
                >
                  {draft.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                  <option value={SELECT_NEW_CUSTOM}>กำหนดเอง...</option>
                </RoundedSelect>
              </div>

              {preview && selectedEntry && !isCreating ? (
                <div
                  className={cn(
                    'flex h-11 w-[76px] shrink-0 items-center justify-center truncate rounded-2xl border px-1.5 text-[13px] font-normal',
                    preview.className,
                  )}
                  style={preview.style}
                >
                  {selectedEntry.label}
                </div>
              ) : null}

              {selectedEntry && !isCreating ? (
                <ColorPickerButton
                  entry={selectedEntry}
                  open={colorOpen}
                  onToggle={() => setColorOpen((v) => !v)}
                />
              ) : null}

              {canDelete ? (
                <HintTooltip tip="ลบกะนี้">
                  <button
                    type="button"
                    onClick={() => handleRemoveShift(selectedEntry!.id)}
                    disabled={isSaving}
                    className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-border text-red-500/80 bb-transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label="ลบกะนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </HintTooltip>
              ) : null}
            </div>

            {colorOpen && selectedEntry && !isCreating ? (
              <ColorPickerPanel
                entry={selectedEntry}
                onChange={(bg, border) =>
                  updateEntry({ ...selectedEntry, bgColor: bg, borderColor: border })
                }
              />
            ) : null}
          </div>

          {isCreating ? (
            <div className="flex animate-in fade-in slide-in-from-top-1 gap-2 duration-200">
              <input
                type="text"
                name="shift-custom-name"
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomNameSubmit()}
                className={cn(SCHEDULE_FIELD_INPUT, 'flex-1')}
                placeholder="พิมพ์ชื่อกะใหม่"
              />
              <button
                type="button"
                onClick={handleCustomNameSubmit}
                disabled={!customName.trim()}
                className={cn(SCHEDULE_BTN_PRIMARY, 'shrink-0')}
              >
                เพิ่ม
              </button>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4 max-md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving}
            className={cn(SCHEDULE_BTN_GHOST, 'mb-2 h-10 w-full')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            คืนค่าเริ่มต้น
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={cn(SCHEDULE_BTN_SECONDARY, 'flex-1')}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isCreating}
              className={cn(SCHEDULE_BTN_PRIMARY, 'flex-1')}
            >
              {isSaving ? <LoadingIcon size="md" /> : null}
              บันทึก
            </button>
          </div>
        </div>
      </FadeModalScaffold>
    </ModalPortal>
  );
}
