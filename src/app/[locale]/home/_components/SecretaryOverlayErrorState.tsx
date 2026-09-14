import { AlertCircle, RefreshCw } from '@/lib/icons';
import { LoadingIcon } from '@/components/ui/loading-icon';

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
      <AlertCircle size={20} strokeWidth={1.75} className="text-muted-foreground" aria-hidden />
      <p className="max-w-sm text-[13px] text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-1.5 text-[13px] text-foreground hover:bg-muted/40"
        >
          <RefreshCw size={14} strokeWidth={1.75} aria-hidden />
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
