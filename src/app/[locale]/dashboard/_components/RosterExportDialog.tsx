'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CloseIcon } from '@/components/ui/close-icon';
import { cn } from '@/lib/utils';
import { BB_BTN_OUTLINE_PRIMARY } from '@/lib/ui-outlined-tokens';

type RosterExportProfile = {
  id: string;
  full_name: string;
};

type Props = {
  open: boolean;
  profiles: RosterExportProfile[];
  initialSelectedId: string | null;
  onClose: () => void;
  onExportSelected: (staffIds: string[]) => void;
  onExportAll: () => void;
};

const DIALOG_CLASS =
  'fixed left-1/2 top-1/2 z-[100] m-0 w-[min(420px,92vw)] max-h-[min(80svh,640px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg open:flex open:flex-col backdrop:bg-black/40';

export function RosterExportDialog({
  open,
  profiles,
  initialSelectedId,
  onClose,
  onExportSelected,
  onExportAll,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const allSelected = profiles.length > 0 && selectedIds.size === profiles.length;
  const someSelected = selectedIds.size > 0;

  const orderedProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.full_name.localeCompare(b.full_name, 'th')),
    [profiles],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const next = new Set<string>();
    if (initialSelectedId && profiles.some((profile) => profile.id === initialSelectedId)) {
      next.add(initialSelectedId);
    } else if (profiles[0]) {
      next.add(profiles[0].id);
    }
    setSelectedIds(next);
  }, [open, initialSelectedId, profiles]);

  const toggleStaff = (staffId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(profiles.map((profile) => profile.id)));
  };

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const clickedInDialogPanel =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!clickedInDialogPanel) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className={DIALOG_CLASS}
      onClose={onClose}
      onClick={handleDialogClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex min-h-0 flex-col p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base text-foreground">บันทึกตารางเวรเป็นรูปภาพ</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              เลือกพนักงานที่ต้องการดาวน์โหลด ระบบจะบันทึกแยกไฟล์ตามคนที่เลือก
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="ปิด"
          >
            <CloseIcon size="md" />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 border-b border-border px-4 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected && !allSelected;
              }}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-foreground">เลือกทั้งหมด</span>
          </label>

          <ul className="divide-y divide-border">
            {orderedProfiles.map((profile) => {
              const checked = selectedIds.has(profile.id);
              return (
                <li key={profile.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStaff(profile.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm text-foreground">{profile.full_name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-border px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onExportAll()}
            disabled={profiles.length === 0}
            className="rounded-2xl border border-border px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            ดาวน์โหลดทุกคน (แยกไฟล์)
          </button>
          <button
            type="button"
            onClick={() => onExportSelected([...selectedIds])}
            disabled={selectedIds.size === 0}
            className={cn(BB_BTN_OUTLINE_PRIMARY, 'disabled:opacity-40')}
          >
            ดาวน์โหลดที่เลือก
          </button>
        </div>
      </div>
    </dialog>
  );
}
