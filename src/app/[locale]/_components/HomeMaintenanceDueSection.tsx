'use client';

import { ArrowUpRight, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toDisplayDate } from '@/lib/maintenance/compute-upcoming-maintenance';
import type { MaintenanceUrgencyGroup, UpcomingMaintenanceTask } from '@/lib/maintenance/types';
import { NavPreloadLink } from '@/components/sidebar/NavPreloadLink';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import type { HomeSectionLayout } from './home-layout';

type HomeMaintenanceDueSectionProps = {
  tasks: UpcomingMaintenanceTask[];
  locale: string;
  layout?: HomeSectionLayout;
};

const URGENCY_LABELS: Record<MaintenanceUrgencyGroup, string> = {
  overdue: 'เลยกำหนดแล้ว',
  within_7_days: 'ภายใน 7 วัน',
  within_30_days: 'ภายใน 1 เดือน',
  within_90_days: 'ภายใน 3 เดือน',
  later: 'อนาคต',
};

function urgencyBadgeClass(urgency: MaintenanceUrgencyGroup): string {
  switch (urgency) {
    case 'overdue':
      return 'border-red-200/80 bg-red-50/70 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300';
    case 'within_7_days':
      return 'border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200';
    case 'within_30_days':
      return 'border-border bg-muted/50 text-muted-foreground';
    default:
      return 'border-border bg-muted/50 text-muted-foreground';
  }
}

function MaintenanceTaskRow({
  task,
  index,
  compact = false,
}: {
  task: UpcomingMaintenanceTask;
  index: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <tr className="bb-grid-row-offscreen border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
        <td className="py-3 px-3 text-center text-[13px] text-muted-foreground tabular-nums w-10">
          {index + 1}
        </td>
        <td className="py-3 px-3 text-[14px] text-foreground font-normal min-w-0">
          <span className="line-clamp-2">{task.equipment}</span>
        </td>
        <td className="py-3 px-3 text-center text-[13px] tabular-nums text-foreground w-28">
          {toDisplayDate(task.dueDate)}
        </td>
        <td className="py-3 px-3 text-center w-32">
          <span
            className={cn(
              'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-normal whitespace-nowrap',
              urgencyBadgeClass(task.urgency),
            )}
          >
            {URGENCY_LABELS[task.urgency]}
          </span>
        </td>
        <td className="py-3 px-3 text-[13px] text-muted-foreground min-w-0">
          <span className="line-clamp-2">{task.advice}</span>
        </td>
      </tr>
    );
  }

  return (
    <article
      className={cn(
        PASTEL_SURFACE,
        'bb-grid-row-offscreen rounded-2xl border border-black/8 bg-[#f3f8ff] p-3.5 bb-shadow-sm flex flex-col gap-2.5',
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-black/45 tabular-nums">#{index + 1}</p>
          <h3 className="text-[15px] font-normal text-black leading-snug line-clamp-2 mt-0.5">
            {task.equipment}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-black/45">ครบกำหนด</p>
          <p className="text-[14px] tabular-nums font-normal text-black leading-none">
            {toDisplayDate(task.dueDate)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span
          className={cn(
            'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-normal',
            urgencyBadgeClass(task.urgency),
          )}
        >
          {URGENCY_LABELS[task.urgency]}
        </span>
        <span className="text-black/55 line-clamp-2 text-right">{task.advice}</span>
      </div>
    </article>
  );
}

export default function HomeMaintenanceDueSection({
  tasks,
  locale,
  layout = 'default',
}: HomeMaintenanceDueSectionProps) {
  const isDashboard = layout === 'dashboard';
  const maintenanceHref = `/${locale}/maintenance`;

  return (
    <section
      aria-label="รายการซ่อมบำรุงที่ต้องทำภายใน 1 เดือน"
      className={cn(
        'rounded-3xl border border-border bg-card bb-shadow-sm',
        isDashboard
          ? 'md:flex-1 md:min-h-0 md:flex md:flex-col p-5 md:p-5 h-full'
          : 'p-5 md:p-7',
      )}
    >
      <header
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between shrink-0',
          isDashboard ? 'mb-3 md:mb-2.5' : 'mb-5',
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted bb-shadow-sm">
            <Wrench className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-[clamp(1rem,2.5vw,1.25rem)] font-normal text-foreground tracking-tight leading-snug">
              รายการซ่อมบำรุงที่ต้องทำภายใน 1 เดือน
            </h2>
            <p className="mt-1 text-[0.8rem] font-normal text-muted-foreground/90 tracking-wide">
              บันทึกการซ่อม · รวมงานค้างและงานที่ครบกำหนดภายใน 30 วัน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] tabular-nums font-normal',
              tasks.length > 0
                ? 'border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
                : 'border-border bg-muted/50 text-muted-foreground',
            )}
          >
            <Wrench className="h-3.5 w-3.5 opacity-70" aria-hidden />
            {tasks.length} รายการ
          </span>
          <NavPreloadLink
            href={maintenanceHref}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] text-foreground transition-colors hover:bg-muted/60"
          >
            บันทึกการซ่อม
            <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </NavPreloadLink>
        </div>
      </header>

      {tasks.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-4 text-center',
            isDashboard ? 'md:flex-1 py-8' : 'py-12',
          )}
        >
          <Wrench className="h-10 w-10 text-muted-foreground/25 mb-3" aria-hidden />
          <p className="text-[15px] text-muted-foreground font-normal">
            ไม่มีรายการซ่อมบำรุงที่ต้องทำภายใน 1 เดือน
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground/70">
            งานซ่อมบำรุงทุกรายการอยู่ในกำหนดที่เหมาะสม
          </p>
        </div>
      ) : (
        <>
          <div className="md:hidden max-h-[min(60svh,28rem)] overflow-y-auto bb-smooth-scroll -mx-1 px-1">
            <div className="space-y-2.5">
              {tasks.map((task, idx) => (
                <MaintenanceTaskRow key={task.id} task={task} index={idx} />
              ))}
            </div>
          </div>

          <div
            className={cn(
              'hidden md:block rounded-2xl border border-border overflow-hidden bb-shadow-sm',
              isDashboard && 'md:flex-1 md:min-h-0 md:flex md:flex-col',
            )}
          >
            <div
              className={cn(
                'overflow-y-auto bb-smooth-scroll',
                isDashboard ? 'md:flex-1 md:min-h-0' : 'max-h-[min(55vh,24rem)]',
              )}
            >
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/60">
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground text-center w-10">
                      #
                    </th>
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground">
                      อุปกรณ์
                    </th>
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground text-center w-28">
                      ครบกำหนด
                    </th>
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground text-center w-32">
                      ความเร่งด่วน
                    </th>
                    <th className="py-3 px-3 text-[12px] font-normal text-muted-foreground">
                      คำแนะนำ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, idx) => (
                    <MaintenanceTaskRow key={task.id} task={task} index={idx} compact />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
