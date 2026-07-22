'use client';

import { formatAddressProfileLabel } from '@/lib/bean-orders/address';
import type { ThaiPostalAddressValue } from '@/lib/bean-orders/address';

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
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted/30"
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
