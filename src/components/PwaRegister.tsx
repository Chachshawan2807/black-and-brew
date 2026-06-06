'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      // Small delay to ensure it doesn't block main thread loading
      setTimeout(() => {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((registrationError) => {
            console.error('SW registration failed:', registrationError);
          });
      }, 1000);
    }
  }, []);

  return null;
}
