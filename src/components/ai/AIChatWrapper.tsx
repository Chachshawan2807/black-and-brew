'use client';

import dynamic from 'next/dynamic';

const AIChatOverlay = dynamic(() => import('./AIChatOverlay'), {
  ssr: false,
});

export default function AIChatWrapper() {
  return <AIChatOverlay />;
}
