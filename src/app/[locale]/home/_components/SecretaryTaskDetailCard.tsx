'use client';

import {
  resolveSecretaryCardTitleFontClass,
  splitSecretaryCardTitle,
} from '@/lib/secretary/format-card-title';
import { resolveSecretaryBoardCardClass } from '@/lib/secretary/board-card-surface';
import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import type { SecretaryModule } from '@/lib/secretary/types';
import { cn } from '@/lib/utils';

type SecretaryTaskDetailCardProps = {
  item: SecretaryAttentionListItem;
  module: SecretaryModule;
  /** Schedule day labels (e.g. ส. ที่ 19) stay on one line inside the card. */
  scheduleDayLabel?: boolean;
};

/** Read-only pastel square card matching the home secretary task board. */
export function SecretaryTaskDetailCard({
  item,
  module,
  scheduleDayLabel = false,
}: SecretaryTaskDetailCardProps) {
  const titleLines = scheduleDayLabel ? [item.primary] : splitSecretaryCardTitle(item.primary);
  const titleFontClass = scheduleDayLabel
    ? 'text-[13px] leading-snug sm:text-[14px]'
    : resolveSecretaryCardTitleFontClass(titleLines.length);

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col rounded-2xl border p-2 bb-shadow-sm',
        scheduleDayLabel ? 'aspect-square min-w-[7.25rem]' : 'aspect-square',
        resolveSecretaryBoardCardClass(module),
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-auto overscroll-contain bb-smooth-scroll px-0.5">
        <div className="my-auto flex w-full flex-col items-center gap-1">
          <p
            className={cn(
              'text-center tracking-[0.01em] text-black',
              scheduleDayLabel
                ? 'whitespace-nowrap text-[13px] leading-snug sm:text-[14px]'
                : cn(
                    'flex w-full flex-col items-center gap-0.5 [line-break:strict] [overflow-wrap:normal] [word-break:keep-all]',
                    titleFontClass,
                  ),
            )}
          >
            {scheduleDayLabel ? (
              item.primary
            ) : (
              titleLines.map((line, index) => (
                <span key={`${item.id}-line-${index}`} className="block max-w-full">
                  {line}
                </span>
              ))
            )}
          </p>
          {item.secondary ? (
            <p
              className={cn(
                'text-center text-[11px] leading-snug text-black/70 sm:text-[12px]',
                scheduleDayLabel && 'whitespace-nowrap',
              )}
            >
              {item.secondary}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
