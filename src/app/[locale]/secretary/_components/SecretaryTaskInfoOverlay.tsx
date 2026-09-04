'use client';

import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import SecretaryTaskPanelShell, { SecretaryTaskDetailRow } from './SecretaryTaskPanelShell';

type SecretaryTaskInfoOverlayProps = {
  title: string;
  items: SecretaryAttentionListItem[];
  emptyMessage?: string;
  onClose: () => void;
};

/** Read-only secretary task detail without route navigation. */
export default function SecretaryTaskInfoOverlay({
  title,
  items,
  emptyMessage = 'ไม่มีรายละเอียดเพิ่มเติม',
  onClose,
}: SecretaryTaskInfoOverlayProps) {
  return (
    <SecretaryTaskPanelShell title={title} onClose={onClose} maxWidthClass="max-w-lg">
      <ul className="space-y-2 pb-1">
        {items.length === 0 ? (
          <li className="px-1 py-10 text-center text-[13px] text-muted-foreground">
            {emptyMessage}
          </li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-border bg-background px-4 py-3"
            >
              <SecretaryTaskDetailRow item={item} />
            </li>
          ))
        )}
      </ul>
    </SecretaryTaskPanelShell>
  );
}
