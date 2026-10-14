'use client';

import type { SecretaryBoardDisplayTask } from '@/lib/secretary/consolidate-board-tasks';
import { canOpenSecretaryTaskDetail } from '@/lib/secretary/task-detail-overlay';
import type { HomeSceneZone } from '@/lib/home-scene-zones';
import { cn } from '@/lib/utils';
import { BB_FOCUS_RING } from '@/lib/ui-outlined-tokens';
import SecretaryTaskPanelShell from './SecretaryTaskPanelShell';

type HomeSceneZoneOverlayProps = {
  zone: HomeSceneZone<SecretaryBoardDisplayTask>;
  onClose: () => void;
  onOpenTask: (task: SecretaryBoardDisplayTask) => void;
};

function taskStatusLabel(task: SecretaryBoardDisplayTask) {
  if (task.status === 'done') return 'เสร็จแล้ว';
  if (task.status === 'in_progress') return 'กำลังทำ';
  if (task.status === 'skipped') return 'ข้ามแล้ว';
  return task.priority === 'urgent' ? 'เร่งด่วน' : 'รอดำเนินการ';
}

export default function HomeSceneZoneOverlay({ zone, onClose, onOpenTask }: HomeSceneZoneOverlayProps) {
  return (
    <SecretaryTaskPanelShell
      title={zone.label}
      subtitle={`${zone.description} · ค้าง ${zone.activeCount} งาน`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      {zone.tasks.length === 0 ? (
        <p className="px-1 py-10 text-center text-[13px] text-muted-foreground">
          ไม่มีงานในส่วนนี้วันนี้
        </p>
      ) : (
        <ul className="space-y-2 pb-1">
          {zone.tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                disabled={!canOpenSecretaryTaskDetail(task)}
                onClick={() => onOpenTask(task)}
                className={cn(
                  'flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-2 text-left text-foreground disabled:opacity-60',
                  BB_FOCUS_RING,
                )}
              >
                <span className="min-w-0 truncate text-sm">{task.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{taskStatusLabel(task)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SecretaryTaskPanelShell>
  );
}
