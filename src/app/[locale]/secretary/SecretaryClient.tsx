'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { CheckCircle2, Plus } from '@/lib/icons';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { SECRETARY_TASK_COLORS } from '@/lib/shift-colors';
import { canOpenSecretaryTaskDetail } from '@/lib/secretary/task-detail-overlay';
import {
  completeSecretaryTasks,
  createManualSecretaryTask,
} from '@/app/actions/secretary-actions';
import { resolveSecretaryCardTitleFontClass, splitSecretaryCardTitle } from '@/lib/secretary/format-card-title';
import {
  countConsolidatedSecretaryBoardTasks,
  countConsolidatedSecretaryBoardTasksByModule,
  filterConsolidatedSecretaryBoardTasks,
  type SecretaryBoardDisplayTask,
} from '@/lib/secretary/consolidate-board-tasks';
import { mergeSecretarySnapshot } from '@/lib/secretary/snapshot-patch';
import {
  requestSecretaryBoardFullSync,
  useSecretaryBoardSync,
  type BoardSyncPayload,
} from '@/hooks/use-secretary-board-sync';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import { resolveSecretaryTaskOverlayKind } from '@/lib/secretary/resolve-task-overlay';
import {
  preloadSecretaryOverlayForTask,
  preloadSecretaryTaskOverlayShell,
} from '@/lib/secretary/preload-secretary-overlay';
import { preloadSecretaryManualTaskDialog } from '@/lib/preload-secretary-manual-task-dialog';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryBoard } from '@/app/actions/secretary-actions';
import type { SecretaryTask } from '@/lib/secretary/types';
import SecretaryTaskOverlay from './_components/SecretaryTaskOverlay';

const SecretaryManualTaskDialog = dynamic(
  () => import('./_components/SecretaryManualTaskDialog'),
  { ssr: false },
);

type SecretaryClientProps = {
  initialBoard: SecretaryBoard;
  locale: string;
};

type ModuleFilter = 'all' | SecretaryTask['module'];

const MODULE_LABELS: Record<SecretaryTask['module'], string> = {
  schedule: 'ตารางงาน',
  dashboard: 'แดชบอร์ด',
  inventory: 'คลัง',
  inventory_count: 'ตรวจนับ',
  inventory_accuracy: 'ความแม่นยำ',
  branch_withdraw: 'เบิกสาขา 2',
  bean_orders: 'ออเดอร์เมล็ดกาแฟ',
  maintenance: 'ซ่อมบำรุง',
  branch2: 'สาขา 2',
  custom: 'งานเอง',
};

const MODULE_FILTER_TIPS: Record<SecretaryTask['module'], string> = {
  schedule: 'งานจากตารางกะและการจัดคน',
  dashboard: 'งานจากแดชบอร์ดภาพรวม',
  inventory: 'งานสั่งซื้อและคลังสินค้า',
  inventory_count: 'งานตรวจนับสต็อก',
  inventory_accuracy: 'งานตรวจความแม่นยำสต็อก',
  branch_withdraw: 'งานเบิกของไปสาขา 2',
  bean_orders: 'งานออเดอร์เมล็ดกาแฟ',
  maintenance: 'งานซ่อมบำรุงอุปกรณ์',
  branch2: 'งานวันไปสาขา 2',
  custom: 'งานที่เพิ่มเอง',
};

export default function SecretaryClient({ initialBoard, locale }: SecretaryClientProps) {
  const [board, setBoard] = useState(initialBoard);
  const [workDateIso, setWorkDateIso] = useState(() => initialBoard.snapshot.dateIso || todayIsoBkk());
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPending, startTransition] = useTransition();
  const [overlayTask, setOverlayTask] = useState<SecretaryBoardDisplayTask | null>(null);

  const applyBoardSync = useCallback((payload: BoardSyncPayload) => {
    setBoard((prev) => {
      const nextSnapshot = payload.snapshot
        ? payload.snapshot
        : payload.snapshotPatch
          ? mergeSecretarySnapshot(prev.snapshot, payload.snapshotPatch)
          : prev.snapshot;

      return {
        ...prev,
        tasks: payload.tasks,
        snapshot: nextSnapshot,
      };
    });
    if (payload.snapshot?.dateIso) {
      setWorkDateIso(payload.snapshot.dateIso);
    } else if (payload.snapshotPatch?.dateIso) {
      setWorkDateIso(payload.snapshotPatch.dateIso);
    }
  }, []);

  const boardRef = useRef(board);
  useEffect(() => {
    boardRef.current = board;
  });

  useSecretaryBoardSync({
    dateIso: workDateIso,
    locale,
    onSync: applyBoardSync,
    onWorkDateChange: setWorkDateIso,
    getBaseSnapshot: () => boardRef.current.snapshot,
    skipInitialFullSync: true,
  });

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      requestSecretaryBoardFullSync();
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const visibility = { workDateIso };

  const visibleTasks = useMemo(
    () => filterConsolidatedSecretaryBoardTasks(board.tasks, moduleFilter, visibility),
    [board.tasks, moduleFilter, workDateIso],
  );

  const openableOverlayKinds = useMemo(() => {
    const kinds = new Set<NonNullable<ReturnType<typeof resolveSecretaryTaskOverlayKind>>>();
    for (const task of visibleTasks) {
      if (!canOpenSecretaryTaskDetail(task)) continue;
      const kind = resolveSecretaryTaskOverlayKind(task);
      if (kind) kinds.add(kind);
    }
    return kinds;
  }, [visibleTasks]);

  useEffect(() => {
    if (openableOverlayKinds.size === 0) return;

    return scheduleIdleWork(() => {
      preloadSecretaryTaskOverlayShell();
      for (const task of visibleTasks) {
        if (!canOpenSecretaryTaskDetail(task)) continue;
        preloadSecretaryOverlayForTask(task);
      }
    }, { timeout: 2000 });
  }, [openableOverlayKinds, visibleTasks]);

  const visibleTaskCount = useMemo(
    () => countConsolidatedSecretaryBoardTasks(board.tasks, 'all', visibility),
    [board.tasks, workDateIso],
  );

  const handleComplete = (taskIds: string[]) => {
    startTransition(async () => {
      const result = await completeSecretaryTasks(taskIds);
      if (!result.success || !result.tasks) return;

      const completedById = new Map(result.tasks.map((task) => [task.id, task]));
      setBoard((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) => completedById.get(task.id) ?? task),
      }));
    });
  };

  const handleAddTask = () => {
    const title = newTitle.trim();
    if (!title) return;

    startTransition(async () => {
      const result = await createManualSecretaryTask({
        title,
        description: newDescription.trim() || undefined,
        scheduledDate: workDateIso,
        priority: 'normal',
      });
      if (!result.success || !result.task) return;

      setBoard((prev) => ({ ...prev, tasks: [...prev.tasks, result.task!] }));
      setNewTitle('');
      setNewDescription('');
      setShowCreateDialog(false);
    });
  };

  const handleTaskUpdated = useCallback((task: SecretaryTask) => {
    setBoard((prev) => ({
      ...prev,
      tasks: prev.tasks.map((entry) => (entry.id === task.id ? task : entry)),
    }));
  }, []);

  const handleTaskDeleted = useCallback((taskId: string) => {
    setBoard((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((entry) => entry.id !== taskId),
    }));
    setOverlayTask((current) => (current?.id === taskId ? null : current));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)] space-y-5">
      <p className="bb-page-subtitle">รวมงานจากทุกโมดูล · อัปเดตอัตโนมัติ</p>

      <div className="flex flex-wrap gap-2 items-center">
        <HintTooltip tip="เพิ่มงานที่ไม่ได้มาจากระบบอัตโนมัติ">
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            onPointerEnter={preloadSecretaryManualTaskDialog}
            onFocus={preloadSecretaryManualTaskDialog}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-1.5 text-[13px] text-foreground hover:bg-muted/40 bb-transition"
          >
            <Plus size={14} />
            เพิ่มงาน
          </button>
        </HintTooltip>
      </div>

      <SecretaryManualTaskDialog
        open={showCreateDialog}
        mode="create"
        title={newTitle}
        description={newDescription}
        isPending={isPending}
        onTitleChange={setNewTitle}
        onDescriptionChange={setNewDescription}
        onClose={() => {
          if (isPending) return;
          setShowCreateDialog(false);
          setNewTitle('');
          setNewDescription('');
        }}
        onSave={handleAddTask}
      />

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={moduleFilter === 'all'}
          onClick={() => setModuleFilter('all')}
          label={`ทั้งหมด (${visibleTaskCount})`}
          tip="แสดงงานทุกโมดูล รวมงานที่เสร็จแล้ว"
        />
        {(Object.keys(MODULE_LABELS) as SecretaryTask['module'][]).map((module) => {
          const count = countConsolidatedSecretaryBoardTasksByModule(board.tasks, module, {
            workDateIso,
          });
          if (count === 0) return null;
          return (
            <FilterChip
              key={module}
              active={moduleFilter === module}
              onClick={() => setModuleFilter(module)}
              label={`${MODULE_LABELS[module]} (${count})`}
              tip={MODULE_FILTER_TIPS[module]}
            />
          );
        })}
      </div>

      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {visibleTasks.length === 0 ? (
          <li className="col-span-full list-none">
            <EmptyState>ไม่มีงานในตัวกรองนี้</EmptyState>
          </li>
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDone={task.status === 'done'}
              isPending={isPending}
              onPreloadOpen={
                canOpenSecretaryTaskDetail(task)
                  ? () => preloadSecretaryOverlayForTask(task)
                  : undefined
              }
              onOpen={() => setOverlayTask(task)}
              onComplete={() => handleComplete(task.consolidatedTaskIds)}
            />
          ))
        )}
      </ul>

      <SecretaryTaskOverlay
        task={overlayTask}
        snapshot={board.snapshot}
        locale={locale}
        onClose={() => setOverlayTask(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        isPending={isPending}
      />
    </div>
  );
}

function TaskCard({
  task,
  isDone,
  isPending,
  onPreloadOpen,
  onOpen,
  onComplete,
}: {
  task: SecretaryBoardDisplayTask;
  isDone: boolean;
  isPending: boolean;
  onPreloadOpen?: () => void;
  onOpen: () => void;
  onComplete: () => void;
}) {
  const titleLines = splitSecretaryCardTitle(task.title);
  const titleFontClass = resolveSecretaryCardTitleFontClass(titleLines.length);
  const canOpenDetail = canOpenSecretaryTaskDetail(task);
  const cardClassName = cn(
    'relative flex aspect-square min-h-0 rounded-2xl border p-2.5 bb-transition',
    isDone ? SECRETARY_TASK_COLORS.done : SECRETARY_TASK_COLORS.card,
    canOpenDetail ? 'hover:brightness-[0.98] cursor-pointer' : 'cursor-default',
  );

  const actionButton = isDone ? (
    <HintTooltip tip="งานนี้เสร็จแล้ว">
      <span
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-foreground/30 text-black/70',
          SECRETARY_TASK_COLORS.doneAction,
        )}
        aria-hidden
      >
        <CheckCircle2 size={14} />
      </span>
    </HintTooltip>
  ) : (
    <HintTooltip tip="ยืนยันเสร็จสิ้น">
      <button
        type="button"
        aria-label={`ยืนยันเสร็จสิ้น ${task.title}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onComplete();
        }}
        disabled={isPending}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-card text-foreground hover:bg-muted/50 disabled:opacity-60"
      >
        <CheckCircle2 size={14} />
      </button>
    </HintTooltip>
  );

  const openTip = !canOpenDetail
    ? 'งานนี้ไม่มีรายละเอียดเพิ่มเติม'
    : isDone
      ? 'เปิดรายละเอียดงานที่เสร็จแล้ว'
      : 'เปิดรายละเอียดงาน';

  const body = (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain bb-smooth-scroll px-0.5 pb-8 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="my-auto flex w-full flex-col items-center gap-1">
          <p
            className={cn(
              'flex w-full flex-col items-center gap-0.5 text-center tracking-[0.01em] [line-break:strict] [overflow-wrap:normal] [word-break:keep-all]',
              titleFontClass,
              isDone ? 'text-black' : 'text-foreground',
            )}
          >
            {titleLines.map((line, index) => (
              <span key={`${task.id}-${index}`} className="block max-w-full">
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-end p-2">
        <div className="pointer-events-auto">{actionButton}</div>
      </div>
    </>
  );

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canOpenDetail) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  const warmOverlayChunk = () => {
    onPreloadOpen?.();
  };

  return (
    <li className="min-h-0">
      <HintTooltip tip={openTip}>
        <div
          role={canOpenDetail ? 'button' : undefined}
          tabIndex={canOpenDetail ? 0 : undefined}
          onClick={canOpenDetail ? onOpen : undefined}
          onKeyDown={canOpenDetail ? handleCardKeyDown : undefined}
          onPointerEnter={canOpenDetail ? warmOverlayChunk : undefined}
          onFocus={canOpenDetail ? warmOverlayChunk : undefined}
          onPointerDown={canOpenDetail ? warmOverlayChunk : undefined}
          aria-label={canOpenDetail ? `เปิดรายละเอียดงาน ${task.title}` : undefined}
          className={cn(cardClassName, 'block size-full text-left')}
        >
          {body}
        </div>
      </HintTooltip>
    </li>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  tip,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tip: string;
}) {
  return (
    <HintTooltip tip={tip}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'rounded-2xl border px-3 py-1 text-[12px] bb-transition',
          active
            ? 'border-foreground bg-card text-foreground ring-1 ring-foreground/10'
            : 'border-border text-muted-foreground hover:text-foreground',
        )}
      >
        {label}
      </button>
    </HintTooltip>
  );
}
