'use client';

import { useParams } from 'next/navigation';
import { PwaInstallButton } from '@/components/PwaInstallButton';

/** Install affordance shown only on the PIN entry screen (inside PinGateway). */
export function PwaInstallShell() {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'th';

  return (
    <PwaInstallButton
      locale={locale}
      className="pointer-events-none fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[10000] flex justify-center"
    />
  );
}
