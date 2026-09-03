type SecretaryOverlayErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function SecretaryOverlayErrorState({
  message,
  onRetry,
  retryLabel = 'ลองใหม่',
}: SecretaryOverlayErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
      <p className="max-w-sm text-[13px] text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-border px-4 py-1.5 text-[13px] text-foreground hover:bg-muted/40"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
