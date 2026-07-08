'use client';

import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[locale error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="min-h-[60svh] flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-base font-normal text-foreground">โหลดหน้านี้ไม่สำเร็จ</p>
      <p className="text-sm text-muted-foreground max-w-md">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-2xl border border-border bg-card px-4 py-2 text-sm font-normal text-foreground"
      >
        ลองใหม่
      </button>
    </div>
  );
}
