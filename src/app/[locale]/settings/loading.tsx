import { cn } from '@/lib/utils';
import { SETTINGS_SECTION, SETTINGS_SECTION_BODY } from './_components/settings-ui-primitives';

interface SettingsLoadingProps {
  label?: string;
}

export function SettingsLoadingSkeleton({ label }: SettingsLoadingProps = {}) {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full text-[14px] leading-relaxed bb-enter-fade-up">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl border border-border bg-muted/40 bb-shimmer" />
        <div className="space-y-2">
          <div className="h-5 w-24 rounded-full bg-muted bb-shimmer" />
          <div className="h-3.5 w-48 rounded-full bg-muted/70 bb-shimmer" />
        </div>
      </div>

      <div className="space-y-3 bb-stagger-children">
        <div className={cn(SETTINGS_SECTION, SETTINGS_SECTION_BODY, 'space-y-3')}>
          <div className="h-3.5 w-28 rounded-full bg-muted bb-shimmer" />
          <div className="h-3 w-full max-w-md rounded-full bg-muted/70 bb-shimmer" />
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-4 py-2">
              <div className="space-y-1.5 flex-1">
                <div className="h-3.5 w-36 rounded-full bg-muted bb-shimmer" />
                <div className="h-3 w-52 max-w-full rounded-full bg-muted/70 bb-shimmer" />
              </div>
              <div className="h-7 w-12 rounded-xl border-2 border-border bg-muted/40 bb-shimmer shrink-0" />
            </div>
          ))}
        </div>

        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={cn(SETTINGS_SECTION, SETTINGS_SECTION_BODY, 'flex items-center gap-3')}>
            <div className="h-10 w-10 rounded-2xl border border-border bg-muted/40 bb-shimmer shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 rounded-full bg-muted bb-shimmer" />
              <div className="h-3 w-56 max-w-full rounded-full bg-muted/70 bb-shimmer" />
            </div>
            <div className="h-4 w-4 rounded border border-border bg-muted/70 bb-shimmer shrink-0" />
          </div>
        ))}
      </div>

      {label ? (
        <p className="mt-6 text-center text-[13px] font-normal text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}

export default function SettingsLoading() {
  return <SettingsLoadingSkeleton label="กำลังโหลดการตั้งค่า…" />;
}
