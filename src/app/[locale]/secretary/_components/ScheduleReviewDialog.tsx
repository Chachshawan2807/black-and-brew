'use client';

import Link from 'next/link';
import { CalendarDays, X } from 'lucide-react';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { splitSecretaryCardTitle } from '@/lib/secretary/format-card-title';
import { parseScheduleReviewDescription } from '@/lib/secretary/parse-schedule-review-description';
import { cn } from '@/lib/utils';
import { SECRETARY_MODAL_LAYOUT_CLASS, SECRETARY_MODAL_SCAFFOLD_PROPS } from './secretary-modal-layout';

type ScheduleReviewDialogProps = {
  open: boolean;
  title: string;
  description: string;
  actionHref: string;
  onClose: () => void;
};

export default function ScheduleReviewDialog({
  open,
  title,
  description,
  actionHref,
  onClose,
}: ScheduleReviewDialogProps) {
  const titleLines = splitSecretaryCardTitle(title);
  const entries = parseScheduleReviewDescription(description);

  return (
    <ModalPortal>
      <FadeModalScaffold
        open={open}
        onClose={onClose}
        zIndex={220}
        {...SECRETARY_MODAL_SCAFFOLD_PROPS}
        overlayClassName={cn('bg-black/20 backdrop-blur-sm', INVENTORY_MODAL_Z_CLASS)}
        layoutClassName={SECRETARY_MODAL_LAYOUT_CLASS}
        panelClassName="w-full max-w-md"
        aria-label={title}
      >
        <div className="flex max-h-[min(80svh,36rem)] w-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                <CalendarDays size={13} aria-hidden />
                <span>ตารางงาน</span>
              </div>
              <h2 className="text-[16px] font-normal leading-snug text-foreground">
                {titleLines.map((line, index) => (
                  <span key={`${line}-${index}`} className={index === 0 ? 'block' : 'block text-muted-foreground'}>
                    {line}
                  </span>
                ))}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/50"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 bb-smooth-scroll [scrollbar-width:thin]">
            {entries.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
                ไม่มีรายละเอียดเพิ่มเติม
              </p>
            ) : (
              <ul className="space-y-2">
                {entries.map((entry) => (
                  <li
                    key={`${entry.dayLabel}-${entry.detail}`}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 px-3 py-3"
                  >
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[12px] tabular-nums text-foreground">
                      {entry.dayLabel}
                    </span>
                    {entry.detail ? (
                      <span className="min-w-0 pt-0.5 text-[14px] leading-snug text-foreground">
                        {entry.detail}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t border-border px-4 py-4">
            <Link
              href={actionHref}
              onClick={onClose}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-border bg-card text-[14px] text-foreground bb-transition hover:bg-muted/40"
            >
              เปิดตารางงาน
            </Link>
          </div>
        </div>
      </FadeModalScaffold>
    </ModalPortal>
  );
}
