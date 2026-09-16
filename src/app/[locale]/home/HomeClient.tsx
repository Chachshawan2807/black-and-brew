'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ClipboardList, Plus } from '@/lib/icons';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';
import {
  BB_BTN_OUTLINE_SM,
  BB_CHIP_IDLE,
  BB_CHIP_SELECTED,
  BB_COUNT_BADGE_ACTIVE,
  BB_COUNT_BADGE_BASE,
  BB_COUNT_BADGE_IDLE,
  BB_DATA_CARD,
} from '@/lib/ui-outlined-tokens';
import {
  formatSecretaryWorkDateLabel,
  resolveSecretaryBoardCardClass,
  SECRETARY_MODULE_BOARD_TAGS,
} from '@/lib/secretary/board-card-surface';
import { HomePanelEmptyState } from '@/app/[locale]/_components/home-panel-primitives';
import { mergeSecretarySnapshot } from '@/lib/secretary/snapshot-patch';
import { canOpenSecretaryTaskDetail } from '@/lib/secretary/task-detail-overlay';
import { createManualSecretaryTask } from '@/app/actions/home-actions';
import { resolveSecretaryCardTitleFontClass, splitSecretaryCardTitle } from '@/lib/secretary/format-card-title';
import {
  countConsolidatedSecretaryBoardTasks,
  countConsolidatedSecretaryBoardTasksByModule,
  filterConsolidatedSecretaryBoardTasks,
  type SecretaryBoardDisplayTask,
} from '@/lib/secretary/consolidate-board-tasks';
import {
  publishHomeSidebarPendingCount,
  requestHomeBoardFullSync,
  useHomeBoardSync,
  type BoardSyncPayload,
} from '@/hooks/use-home-board-sync';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import {
  preloadSecretaryOverlayForTask,
  preloadSecretaryTaskOverlayShell,
} from '@/lib/secretary/preload-secretary-overlay';
import { preloadSecretaryManualTaskDialog } from '@/lib/preload-secretary-manual-task-dialog';
import { writeCachedSecretaryBoard } from '@/lib/secretary/home-board-cache';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryBoard } from '@/app/actions/home-actions';
import type { HomeBoardLoadSource } from '@/lib/perf/home-board-perf';
import {
  homePerfOnBoardVisible,
  homePerfStartSession,
  registerHomeBoardPerfDevTools,
} from '@/lib/perf/home-board-perf';
import type { SecretaryTask } from '@/lib/secretary/types';
import SecretaryTaskOverlay from './_components/SecretaryTaskOverlay';
import SecretaryManualTaskDialog from './_components/SecretaryManualTaskDialog';

type HomeClientProps = {
  initialBoard: SecretaryBoard;
  locale: string;
  /** Where the first paint board came from (perf diagnostics only). */
  boardLoadSource?: HomeBoardLoadSource;
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

export default function HomeClient({
  initialBoard,
  locale,
  boardLoadSource = 'ssr',
}: HomeClientProps) {
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
  boardRef.current = board;

  useHomeBoardSync({
    dateIso: workDateIso,
    locale,
    onSync: applyBoardSync,
    onWorkDateChange: setWorkDateIso,
    getBaseSnapshot: () => boardRef.current.snapshot,
    skipInitialFullSync: true,
  });

  useEffect(() => {
    publishHomeSidebarPendingCount(board.tasks, workDateIso);
  }, [board.tasks, workDateIso]);

  useEffect(() => {
    writeCachedSecretaryBoard(board);
  }, [board]);

  useEffect(() => {
    requestHomeBoardFullSync();
  }, []);

  useEffect(() => {
    registerHomeBoardPerfDevTools();
    if (boardLoadSource === 'ssr') {
      homePerfStartSession('ssr-direct');
    }
    homePerfOnBoardVisible({
      taskCount: initialBoard.tasks.length,
      source: boardLoadSource,
    });
  }, [boardLoadSource, initialBoard.tasks.length]);

  const visibility = { workDateIso };

  const visibleTasks = useMemo(
    () => filterConsolidatedSecretaryBoardTasks(board.tasks, moduleFilter, visibility),
    [board.tasks, moduleFilter, workDateIso],
  );

  useEffect(() => {
    if (visibleTasks.length === 0) return;

    return scheduleIdleWork(() => {
      preloadSecretaryTaskOverlayShell();
      for (const task of visibleTasks.slice(0, 6)) {
        preloadSecretaryOverlayForTask(task);
      }
    }, { timeout: 3000 });
  }, [visibleTasks]);

  const visibleTaskCount = useMemo(
    () => countConsolidatedSecretaryBoardTasks(board.tasks, 'all', visibility),
    [board.tasks, workDateIso],
  );

  const workDateLabel = useMemo(
    () => formatSecretaryWorkDateLabel(workDateIso),
    [workDateIso],
  );

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
    <div className="mx-auto w-full max-w-3xl px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)] space-y-4">
      <header>
        <h1 className="bb-page-title-compact text-balance">{workDateLabel}</h1>
      </header>

      <div className={cn(BB_DATA_CARD, 'space-y-3 p-3 sm:p-4')}>
        <div className="flex flex-wrap gap-2 items-center justify-start">
          <HintTooltip tip="เพิ่มงานที่ไม่ได้มาจากระบบอัตโนมัติ">
            <button
              type="button"
              onClick={() => setShowCreateDialog(true)}
              onPointerEnter={preloadSecretaryManualTaskDialog}
              onFocus={preloadSecretaryManualTaskDialog}
              className={BB_BTN_OUTLINE_SM}
            >
              <Plus size={14} />
              เพิ่มงาน
            </button>
          </HintTooltip>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
        <FilterChip
          active={moduleFilter === 'all'}
          onClick={() => setModuleFilter('all')}
          label={`ทั้งหมด (${visibleTaskCount})`}
          tip="แสดงงานทุกโมดูล"
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

      <section aria-label="รายการงาน" className={cn(BB_DATA_CARD, 'p-3 sm:p-4')}>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {visibleTasks.length === 0 ? (
          <li className="col-span-full list-none">
            <HomePanelEmptyState
              compact
              icon={<ClipboardList size={22} strokeWidth={1.5} />}
              title="ไม่มีงานในตัวกรองนี้"
              subtitle="ลองเลือกตัวกรองอื่น หรือเพิ่มงานด้วยตนเอง"
            />
          </li>
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPreloadOpen={() => preloadSecretaryOverlayForTask(task)}
              onOpen={() => setOverlayTask(task)}
            />
          ))
        )}
      </ul>
      </section>

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
  onPreloadOpen,
  onOpen,
}: {
  task: SecretaryBoardDisplayTask;
  onPreloadOpen?: () => void;
  onOpen: () => void;
}) {
  const titleLines = splitSecretaryCardTitle(task.title);
  const titleFontClass = resolveSecretaryCardTitleFontClass(titleLines.length);
  const canOpenDetail = canOpenSecretaryTaskDetail(task);
  const moduleTag = SECRETARY_MODULE_BOARD_TAGS[task.module];
  const groupCount = task.consolidatedTaskIds.length;
  const cardClassName = cn(
    'flex aspect-square min-h-0 flex-col rounded-2xl border p-2 bb-transition bb-shadow-sm',
    resolveSecretaryBoardCardClass(task.module),
    canOpenDetail
      ? 'hover:brightness-[0.98] hover:bb-shadow-md cursor-pointer motion-reduce:hover:brightness-100 active:scale-[0.99] motion-reduce:active:scale-100'
      : 'cursor-default opacity-90',
  );

  const openTip = canOpenDetail ? 'เปิดงาน' : 'งานนี้เปิดไม่ได้';

  const body = (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div className="flex shrink-0 items-center justify-between gap-1">
        <span className="truncate rounded-full border border-black/15 bg-white/55 px-2 py-0.5 text-[10px] leading-none text-black/70">
          {moduleTag}
        </span>
        {groupCount > 1 ? (
          <span className="shrink-0 rounded-full border border-black/15 bg-white/55 px-1.5 py-0.5 text-[10px] tabular-nums leading-none text-black/65">
            ×{groupCount}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bb-smooth-scroll px-0.5">
        <div className="my-auto flex w-full flex-col items-center">
          <p
            className={cn(
              'flex w-full flex-col items-center gap-0.5 text-center tracking-[0.01em] [line-break:strict] [overflow-wrap:normal] [word-break:keep-all]',
              titleFontClass,
              'text-black',
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
    </div>
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
          aria-label={canOpenDetail ? `เปิดงาน ${task.title}` : undefined}
          className={cn(cardClassName, 'block size-full text-left')}
        >
          {body}
        </div>
      </HintTooltip>
    </li>
  );
}

function parseFilterChipLabel(label: string): { text: string; count: string | null } {
  const match = label.match(/^(.+)\s\((\d+)\)$/);
  if (!match) return { text: label, count: null };
  return { text: match[1]!.trim(), count: match[2]! };
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
  const { text, count } = parseFilterChipLabel(label);

  return (
    <HintTooltip tip={tip}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-1.5 min-h-10 rounded-2xl border px-3 py-2 text-[13px] font-normal bb-transition touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          active ? BB_CHIP_SELECTED : BB_CHIP_IDLE,
        )}
      >
        <span className="whitespace-nowrap">{text}</span>
        {count ? (
          <span
            className={cn(
              BB_COUNT_BADGE_BASE,
              active ? BB_COUNT_BADGE_ACTIVE : BB_COUNT_BADGE_IDLE,
            )}
          >
            {count}
          </span>
        ) : null}
      </button>
    </HintTooltip>
  );
}
