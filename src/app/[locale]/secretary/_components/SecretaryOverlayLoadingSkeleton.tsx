export type SecretaryOverlaySkeletonVariant = 'embed' | 'list' | 'form' | 'purchase';

type SecretaryOverlayLoadingSkeletonProps = {
  variant?: SecretaryOverlaySkeletonVariant;
  label?: string;
};

function EmbedSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-1" aria-hidden>
      <div className="h-9 w-40 rounded-full bb-shimmer" />
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-8 rounded-lg bb-shimmer" />
        ))}
      </div>
      <div className="min-h-[12rem] flex-1 space-y-2 rounded-2xl border border-border bg-card p-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-10 rounded-xl bb-shimmer" />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2 py-1" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index} className="rounded-2xl border border-border bg-card px-4 py-3">
          <div className="h-4 w-2/3 max-w-[14rem] rounded-full bb-shimmer" />
          <div className="mt-2 h-3 w-3/4 max-w-[18rem] rounded-full bb-shimmer" />
        </li>
      ))}
    </ul>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4 py-1" aria-hidden>
      <div className="space-y-2">
        <div className="h-3 w-16 rounded-full bb-shimmer" />
        <div className="h-10 rounded-xl border border-border bb-shimmer" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bb-shimmer" />
        <div className="h-24 rounded-xl border border-border bb-shimmer" />
      </div>
    </div>
  );
}

function PurchaseSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-1" aria-hidden>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-8 w-20 rounded-full bb-shimmer" />
        ))}
      </div>
      <div className="min-h-[14rem] flex-1 space-y-2 rounded-2xl border border-border bg-card p-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-9 rounded-xl bb-shimmer" />
        ))}
      </div>
    </div>
  );
}

export function SecretaryOverlayLoadingSkeleton({
  variant = 'embed',
  label = 'กำลังโหลด...',
}: SecretaryOverlayLoadingSkeletonProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" role="status" aria-live="polite" aria-busy="true">
      {variant === 'embed' ? <EmbedSkeleton /> : null}
      {variant === 'list' ? <ListSkeleton /> : null}
      {variant === 'form' ? <FormSkeleton /> : null}
      {variant === 'purchase' ? <PurchaseSkeleton /> : null}
      <p className="mt-3 text-center text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
}
