'use client';

import { Loader2 } from 'lucide-react';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';

type SecretaryGuidanceBarProps = {
  text: string;
  loading?: boolean;
};

export default function SecretaryGuidanceBar({ text, loading = false }: SecretaryGuidanceBarProps) {
  return (
    <section
      aria-live="polite"
      aria-busy={loading}
      className={cn(
        'w-full rounded-2xl border border-border bg-card px-4 py-3 transition-opacity',
        loading ? 'opacity-80' : 'opacity-100',
      )}
    >
      <div className="flex w-full items-start gap-2">
        {loading ? (
          <Loader2
            size={14}
            className="mt-0.5 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <HintTooltip tip="คำแนะนำจัดลำดับงาน — อัปเดตเมื่องานหรือข้อมูลที่เกี่ยวข้องเปลี่ยน">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground w-fit">
              คำแนะนำ
            </p>
          </HintTooltip>
          <p
            className="w-full whitespace-normal text-pretty text-[13px] leading-relaxed text-foreground [overflow-wrap:anywhere] [word-break:break-word]"
            title={text}
          >
            {text}
          </p>
        </div>
      </div>
    </section>
  );
}
