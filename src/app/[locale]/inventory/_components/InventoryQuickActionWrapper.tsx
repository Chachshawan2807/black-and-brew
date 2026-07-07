'use client';

import dynamic from 'next/dynamic';

const InventoryQuickActionFAB = dynamic(() => import('./InventoryQuickActionFAB'), {
  ssr: false,
});

export default function InventoryQuickActionWrapper() {
  return <InventoryQuickActionFAB />;
}
