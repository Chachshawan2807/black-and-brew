'use client';

import { formatAddressProfileLabel } from '@/lib/bean-orders/address';
import type { ThaiPostalAddressValue } from '@/lib/bean-orders/address';
import { BEAN_ORDER_BTN_LIST } from './bean-order-layout';

type Props = {
  title: string;
  profiles: ThaiPostalAddressValue[];
  onSelect: (profile: ThaiPostalAddressValue) => void;
};

export function AddressProfilePicker({ title, profiles, onSelect }: Props) {
  if (profiles.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-sm text-muted-foreground">{title}</p>
      <ul className="divide-y rounded-xl border border-border bg-card">
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
    </div>
  );
}
