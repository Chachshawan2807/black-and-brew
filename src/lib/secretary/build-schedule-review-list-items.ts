import type { SecretaryBoardDisplayTask } from '@/lib/secretary/consolidate-board-tasks';
import { parseScheduleReviewDescription } from '@/lib/secretary/parse-schedule-review-description';
import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';

function formatDaySummary(description: string | null): string {
  const entries = parseScheduleReviewDescription(description ?? '');
  if (entries.length === 0) return '';

  return entries
    .map((entry) => (entry.detail ? `${entry.dayLabel} · ${entry.detail}` : entry.dayLabel))
    .join(', ');
}

function dayEntriesFromDescription(
  description: string | null,
  idPrefix: string,
): SecretaryAttentionListItem[] {
  return parseScheduleReviewDescription(description ?? '').map((entry, index) => ({
    id: `${idPrefix}-day-${index}`,
    primary: entry.dayLabel,
    secondary: entry.detail || undefined,
  }));
}

/** Read-only schedule review rows for secretary task detail overlay. */
export function buildScheduleReviewListItems(
  task: Pick<SecretaryBoardDisplayTask, 'id' | 'description' | 'consolidatedSections'>,
): SecretaryAttentionListItem[] {
  if (task.consolidatedSections?.length) {
    return task.consolidatedSections.flatMap((section, sectionIndex) => {
      const dayItems = dayEntriesFromDescription(section.description, `section-${sectionIndex}`);
      if (dayItems.length === 0) {
        return [{ id: `section-${sectionIndex}`, primary: section.title }];
      }

      if (dayItems.length === 1) {
        const day = dayItems[0]!;
        return [
          {
            id: `section-${sectionIndex}`,
            primary: section.title,
            secondary: day.secondary ? `${day.primary} · ${day.secondary}` : day.primary,
          },
        ];
      }

      const summary = formatDaySummary(section.description);
      return [
        {
          id: `section-${sectionIndex}`,
          primary: section.title,
          secondary: summary || undefined,
        },
      ];
    });
  }

  const dayItems = dayEntriesFromDescription(task.description, task.id);
  if (dayItems.length > 0) return dayItems;

  const summary = task.description?.trim();
  return summary ? [{ id: `${task.id}-summary`, primary: summary }] : [];
}
