interface RouteLoadingSkeletonProps {
  label: string;
}

export function RouteLoadingSkeleton({ label }: RouteLoadingSkeletonProps) {
  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-10 bb-enter-fade-up">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 bb-stagger-children">
        <div className="h-16 rounded-3xl border border-border bg-card bb-shimmer" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-3xl border border-border bg-card bb-shimmer" />
          <div className="h-28 rounded-3xl border border-border bg-card bb-shimmer" />
          <div className="h-28 rounded-3xl border border-border bg-card bb-shimmer" />
        </div>
        <div className="rounded-3xl border border-border bg-card p-4 bb-surface">
          <div className="mb-4 h-4 w-48 rounded-full bb-shimmer" />
          <div className="space-y-3">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="h-10 rounded-2xl bb-shimmer" />
            ))}
          </div>
        </div>
        <p className="text-center text-sm font-normal text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
