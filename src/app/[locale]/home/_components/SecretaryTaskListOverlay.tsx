'use client';

import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import type { SecretaryModule } from '@/lib/secretary/types';
import { resolveScheduleBoardGridClass } from '@/lib/secretary/schedule-board-grid-class';
import { cn } from '@/lib/utils';
import { SecretaryTaskDetailCard } from './SecretaryTaskDetailCard';
import SecretaryTaskPanelShell, { SecretaryTaskDetailRow } from './SecretaryTaskPanelShell';

export type SecretaryTaskListLayout = 'rows' | 'board-cards';

type SecretaryTaskListOverlayProps = {
  title: string;
  items: SecretaryAttentionListItem[];
  emptyMessage?: string;
  onClose: () => void;
  /** Home-board pastel squares; use only for short schedule review data. */
  layout?: SecretaryTaskListLayout;
  module?: SecretaryModule;
  maxWidthClass?: string;
};

/** Read-only task detail list (maintenance and similar). No route navigation. */
export default function SecretaryTaskListOverlay({
  title,
  items,
  emptyMessage = 'ไม่มีรายการ',
  onClose,
  layout = 'rows',
  module = 'schedule',
  maxWidthClass = 'max-w-lg',
}: SecretaryTaskListOverlayProps) {
  const useBoardCards = layout === 'board-cards';
  const scheduleGridClass = resolveScheduleBoardGridClass(items.length);

  return (
    <SecretaryTaskPanelShell
      title={title}
      onClose={onClose}
      maxWidthClass={maxWidthClass}
      fitContent={useBoardCards}
    >
      {items.length === 0 ? (
        <p className="px-1 py-10 text-center text-[13px] text-muted-foreground">{emptyMessage}</p>
      ) : useBoardCards ? (
        <ul
          className={cn(
            'grid w-full max-w-full gap-2 pb-1 sm:gap-2.5',
            scheduleGridClass,
          )}
        >
          {items.map((item) => (
            <li key={item.id} className="min-h-0 w-full list-none">
              <SecretaryTaskDetailCard item={item} module={module} scheduleDayLabel />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2 pb-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-border bg-background px-4 py-3"
            >
              <SecretaryTaskDetailRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </SecretaryTaskPanelShell>
  );
}
