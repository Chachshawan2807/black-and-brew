export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)] space-y-5 bb-enter-fade-up">
      <div className="space-y-2">
        <div className="h-6 w-32 rounded-lg bb-shimmer" />
        <div className="h-4 w-48 rounded-lg bb-shimmer" />
      </div>
      <div className="h-16 rounded-2xl border border-border bg-card bb-shimmer" />
      <div className="flex flex-wrap gap-2">
        <div className="h-8 w-24 rounded-full bb-shimmer" />
        <div className="h-8 w-28 rounded-full bb-shimmer" />
        <div className="h-8 w-20 rounded-full bb-shimmer" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="aspect-square rounded-xl border border-border bg-card bb-shimmer"
          />
        ))}
      </div>
      <p className="text-center text-[13px] text-muted-foreground">กำลังโหลดเลขาส่วนตัว...</p>
    </div>
  );
}
