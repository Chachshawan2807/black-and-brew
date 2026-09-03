'use client';

import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import SecretaryTaskSubwindow from './SecretaryTaskSubwindow';

type SecretaryTaskInfoOverlayProps = {
  title: string;
  items: SecretaryAttentionListItem[];
  emptyMessage?: string;
  onClose: () => void;
};

function ListItemBody({ item }: { item: SecretaryAttentionListItem }) {
  return (
    <>
      <p className="text-[14px] text-foreground">{item.primary}</p>
      {item.secondary ? (
        <p className="mt-0.5 text-[12px] text-muted-foreground">{item.secondary}</p>
      ) : null}
    </>
  );
}

/** Read-only secretary task detail without route navigation. */
export default function SecretaryTaskInfoOverlay({
  title,
  items,
  emptyMessage = 'ไม่มีรายละเอียดเพิ่มเติม',
  onClose,
}: SecretaryTaskInfoOverlayProps) {
  return (
    <SecretaryTaskSubwindow title={title} onClose={onClose} maxWidthClass="max-w-lg">
      <ul className="min-h-0 flex-1 overflow-y-auto bb-smooth-scroll [scrollbar-width:thin]">
        {items.length === 0 ? (
          <li className="px-1 py-8 text-center text-[13px] text-muted-foreground">{emptyMessage}</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="mb-2 rounded-2xl border border-border bg-card px-4 py-3 last:mb-0"
            >
              <ListItemBody item={item} />
            </li>
          ))
        )}
      </ul>
    </SecretaryTaskSubwindow>
  );
}
