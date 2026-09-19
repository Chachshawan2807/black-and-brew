export function HomeTaskCardsSkeleton() {
  return (
    <section
      aria-hidden
      className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4"
    >
      <div className="flex flex-wrap gap-2">
        <div className="h-10 w-24 rounded-2xl bb-shimmer" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="aspect-square rounded-2xl border border-border bg-card bb-shimmer"
          />
        ))}
      </div>
    </section>
  );
}

export function HomeShiftPanelSkeleton() {
  return (
    <section
      aria-hidden
      className="min-w-0 space-y-5 rounded-2xl border border-border bg-card p-3 sm:p-4"
    >
      <div className="h-5 w-32 rounded-lg bb-shimmer" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-[6.75rem] w-[8.25rem] rounded-2xl bb-shimmer" />
        ))}
      </div>
    </section>
  );
}

export function HomePageLoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)] space-y-5 bb-enter-fade-up">
      <div className="space-y-2">
        <div className="h-4 w-48 rounded-lg bb-shimmer" />
      </div>
      <HomeTaskCardsSkeleton />
    </div>
  );
}
