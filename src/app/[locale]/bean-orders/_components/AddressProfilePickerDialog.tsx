'use client';

import { MapPin } from '@/lib/icons';
import { formatAddressProfileLabel } from '@/lib/bean-orders/address';
import type { ThaiPostalAddressValue } from '@/lib/bean-orders/address';
import { BEAN_ORDER_BTN_DIALOG, BEAN_ORDER_BTN_LIST } from './bean-order-layout';
import {
  BeanOrderDialogShell,
  BeanOrderModalHeader,
} from './bean-order-ui-primitives';

type Props = {
  open: boolean;
  title: string;
  profiles: ThaiPostalAddressValue[];
  onSelect: (profile: ThaiPostalAddressValue) => void;
  onCancel: () => void;
};

export function AddressProfilePickerDialog({
  open,
  title,
  profiles,
  onSelect,
  onCancel,
}: Props) {
  return (
    <BeanOrderDialogShell
      open={open}
      onClose={onCancel}
      panelClassName="max-w-[min(480px,92vw)] max-h-[min(80svh,640px)]"
      aria-label={title}
    >
      <BeanOrderModalHeader
        icon={<MapPin className="h-5 w-5" aria-hidden />}
        title={title}
        subtitle="ลูกค้ารายนี้มีที่อยู่มากกว่า 1 รายการ เลือกที่อยู่ที่ต้องการใช้"
        tone="shipping"
        onClose={onCancel}
      />

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-5 pt-0">
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto rounded-xl border border-border bg-card">
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
    </BeanOrderDialogShell>
  );
}
