'use client';

import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ArrowUpRight, Wrench } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { formatDueDateWithDaysRemaining } from '@/lib/maintenance/compute-upcoming-maintenance';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';
import { NavPreloadLink } from '@/components/sidebar/NavPreloadLink';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import {
  HomeSectionBadge,
  HomeSectionHeader,
  homeSectionLinkClassName,
} from './home-section-header';
import {
  HomePanelEmptyState,
  HomePanelMobileScroll,
  HomePanelTableHead,
  HomePanelTableShell,
  HOME_PANEL_TABLE_HEAD_CELL,
  HOME_PANEL_TABLE_ROW,
  homePanelSectionClassName,
} from './home-panel-primitives';
import type { HomeSectionLayout } from './home-layout';

type HomeMaintenanceDueSectionProps = {
  tasks: UpcomingMaintenanceTask[];
  locale: string;
  layout?: HomeSectionLayout;
  /** Optional override for tests; defaults to Bangkok calendar date. */
  currentIsoDate?: string;
};

const BANGKOK_TZ = 'Asia/Bangkok';

function bangkokIsoDate(now = new Date()): string {
  return format(toZonedTime(now, BANGKOK_TZ), 'yyyy-MM-dd');
}

function MaintenanceTaskRow({
  task,
  index,
  dueLabel,
  compact = false,
}: {
  task: UpcomingMaintenanceTask;
  index: number;
  dueLabel: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <tr className={HOME_PANEL_TABLE_ROW}>
        <td className="py-3 px-3 text-center text-[13px] text-muted-foreground tabular-nums w-10">
          {index + 1}
        </td>
        <td className="py-3 px-3 text-[14px] text-foreground font-normal min-w-0">
          <span className="line-clamp-2">{task.equipment}</span>
        </td>
        <td className="py-3 px-3 text-center text-[13px] tabular-nums text-foreground whitespace-nowrap w-40">
          {dueLabel}
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
          <p className="text-[11px] text-black/45 tabular-nums tracking-wide uppercase">
            #{index + 1}
          </p>
          <h3 className="text-[15px] font-normal text-black leading-snug line-clamp-2 mt-0.5">
            {task.equipment}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-black/45 tracking-wide">ครบกำหนด</p>
          <p className="text-[14px] tabular-nums font-normal text-black leading-snug">
            {dueLabel}
          </p>
        </div>
      </div>
      <p className="text-[12px] text-black/55 line-clamp-2">{task.advice}</p>
    </article>
  );
}

export default function HomeMaintenanceDueSection({
  tasks,
  locale,
  layout = 'default',
  currentIsoDate,
}: HomeMaintenanceDueSectionProps) {
  const isDashboard = layout === 'dashboard';
  const maintenanceHref = `/${locale}/maintenance`;
  const todayIso = currentIsoDate ?? bangkokIsoDate();

  return (
    <section
      aria-label="รายการซ่อมบำรุงที่ต้องทำ"
      className={homePanelSectionClassName(isDashboard)}
    >
      <HomeSectionHeader
        compact={isDashboard}
        icon={<Wrench className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} aria-hidden />}
        title="รายการซ่อมบำรุงที่ต้องทำ"
        actions={
          <>
            <HomeSectionBadge
              tone={tasks.length > 0 ? 'warning' : 'neutral'}
              icon={<Wrench className="h-3.5 w-3.5 opacity-70" aria-hidden />}
            >
              {tasks.length} รายการ
            </HomeSectionBadge>
            <NavPreloadLink href={maintenanceHref} className={homeSectionLinkClassName()}>
              บันทึกการซ่อม
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </NavPreloadLink>
          </>
        }
      />

      {tasks.length === 0 ? (
        <HomePanelEmptyState
          dashboard={isDashboard}
          icon={<Wrench className="h-5 w-5" aria-hidden />}
          title="ไม่มีรายการซ่อมบำรุงที่ต้องทำ"
          subtitle="งานซ่อมบำรุงทุกรายการอยู่ในกำหนดที่เหมาะสม"
        />
      ) : (
        <>
          <HomePanelMobileScroll>
            <div className="space-y-2.5">
              {tasks.map((task, idx) => (
                <MaintenanceTaskRow
                  key={task.id}
                  task={task}
                  index={idx}
                  dueLabel={formatDueDateWithDaysRemaining(task.dueDate, todayIso)}
                />
              ))}
            </div>
          </HomePanelMobileScroll>

          <HomePanelTableShell dashboard={isDashboard}>
            <table className="w-full text-left border-collapse">
              <HomePanelTableHead>
                <tr className="border-b border-border">
                  <th className={cn(HOME_PANEL_TABLE_HEAD_CELL, 'text-center w-10')}>#</th>
                  <th className={HOME_PANEL_TABLE_HEAD_CELL}>อุปกรณ์</th>
                  <th className={cn(HOME_PANEL_TABLE_HEAD_CELL, 'text-center w-40')}>ครบกำหนด</th>
                  <th className={HOME_PANEL_TABLE_HEAD_CELL}>คำแนะนำ</th>
                </tr>
              </HomePanelTableHead>
              <tbody>
                {tasks.map((task, idx) => (
                  <MaintenanceTaskRow
                    key={task.id}
                    task={task}
                    index={idx}
                    dueLabel={formatDueDateWithDaysRemaining(task.dueDate, todayIso)}
                    compact
                  />
                ))}
              </tbody>
            </table>
          </HomePanelTableShell>
        </>
      )}
    </section>
  );
}
