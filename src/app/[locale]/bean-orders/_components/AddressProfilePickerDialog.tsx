'use client';

import { useEffect, useRef } from 'react';
import { formatAddressProfileLabel } from '@/lib/bean-orders/address';
import type { ThaiPostalAddressValue } from '@/lib/bean-orders/address';
import { BEAN_ORDER_BTN_DIALOG, BEAN_ORDER_BTN_LIST } from './bean-order-layout';

type Props = {
  open: boolean;
  title: string;
  profiles: ThaiPostalAddressValue[];
  onSelect: (profile: ThaiPostalAddressValue) => void;
  onCancel: () => void;
};

const DIALOG_CLASS =
  'fixed left-1/2 top-1/2 z-50 w-[min(480px,92vw)] max-h-[min(80svh,640px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg open:flex open:flex-col backdrop:bg-black/40';

export function AddressProfilePickerDialog({
  open,
  title,
  profiles,
  onSelect,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={DIALOG_CLASS}
      onClose={onCancel}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="flex min-h-0 flex-col p-4 md:p-5">
        <h3 className="text-base text-foreground">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          ลูกค้ารายนี้มีที่อยู่มากกว่า 1 รายการ — เลือกที่อยู่ที่ต้องการใช้
        </p>

        <ul className="mt-4 min-h-0 flex-1 divide-y overflow-y-auto rounded-xl border border-border bg-card">
          {profiles.map((profile) => (
            <li key={`${profile.name}-${formatAddressProfileLabel(profile)}`}>
              <button
                type="button"
                className={BEAN_ORDER_BTN_LIST}
                onClick={() => onSelect(profile)}
              >
                <span className="block font-normal">{profile.name}</span>
                <span className="block text-muted-foreground">{formatAddressProfileLabel(profile)}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onCancel} className={BEAN_ORDER_BTN_DIALOG}>
            ยกเลิก
          </button>
        </div>
      </div>
    </dialog>
  );
}
