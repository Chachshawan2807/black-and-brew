'use client';

type PageStatusBannerProps = {
  message: string;
  className?: string;
  topClassName?: string;
};

export function PageStatusBanner({
  message,
  className,
  topClassName = 'top-14',
}: PageStatusBannerProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        className ??
        `fixed right-4 ${topClassName} z-50 max-w-[min(100vw-2rem,24rem)] whitespace-pre-line rounded-2xl border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm`
      }
    >
      {message}
    </div>
  );
}
