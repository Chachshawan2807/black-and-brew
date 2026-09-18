'use client';

import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import SecretaryTaskPanelShell, { SecretaryTaskDetailTable } from './SecretaryTaskPanelShell';

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
      {items.length === 0 ? (
        <p className="px-1 py-10 text-center text-[13px] text-muted-foreground">{emptyMessage}</p>
      ) : (
        <SecretaryTaskDetailTable items={items} />
      )}
    </SecretaryTaskPanelShell>
  );
}
