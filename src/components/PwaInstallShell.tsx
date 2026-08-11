'use client';

import { useParams } from 'next/navigation';
import { PwaInstallButton } from '@/components/PwaInstallButton';

/** Global install affordance — above PinGateway (z-9999) so it works on PIN and authenticated screens. */
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
