'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ClipboardList, Plus } from '@/lib/icons';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';
import {
  BB_BTN_MOTION,
  BB_DATA_CARD,
  BB_FOCUS_RING,
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
  consolidateSecretaryBoardTasks,
  type SecretaryBoardDisplayTask,
} from '@/lib/secretary/consolidate-board-tasks';
import { filterVisibleSecretaryBoardTasks } from '@/lib/secretary/visible-board-tasks';
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
  shouldIdlePreloadSecretaryOverlays,
} from '@/lib/secretary/preload-secretary-overlay';
import { preloadSecretaryManualTaskDialog } from '@/lib/preload-secretary-manual-task-dialog';
import { useMobileBackOverlayStack } from '@/hooks/use-mobile-back-overlay-stack';
import { writeCachedHomeMemberPanel, writeCachedSecretaryBoard } from '@/lib/secretary/home-board-cache';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryBoard } from '@/app/actions/home-actions';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import HomeShiftStatusSection from './_components/HomeShiftStatusSection';
import type { HomeBoardLoadSource } from '@/lib/perf/home-board-perf';
import {
  homePerfOnBoardVisible,
  homePerfStartSession,
  registerHomeBoardPerfDevTools,
} from '@/lib/perf/home-board-perf';
import type { SecretaryTask } from '@/lib/secretary/types';
import { useSidebarHydrated, useSidebarToggle } from '@/hooks/use-sidebar-toggle';

const SecretaryTaskOverlay = dynamic(
  () => import('./_components/SecretaryTaskOverlay'),
  { ssr: false },
);
const SecretaryManualTaskDialog = dynamic(
  () => import('./_components/SecretaryManualTaskDialog'),
  { ssr: false },
);
type HomeClientProps = {
  initialBoard: SecretaryBoard;
  initialMemberPanel?: HomeMemberPanelSnapshot;
  locale: string;
  /** Where the first paint board came from (perf diagnostics only). */
  boardLoadSource?: HomeBoardLoadSource;
};

export default function HomeClient({
  initialBoard,
  initialMemberPanel,
  locale,
  boardLoadSource = 'ssr',
}: HomeClientProps) {
  const [board, setBoard] = useState(initialBoard);
  const [workDateIso, setWorkDateIso] = useState(() => initialBoard.snapshot.dateIso || todayIsoBkk());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isPending, startTransition] = useTransition();
  const [overlayTask, setOverlayTask] = useState<SecretaryBoardDisplayTask | null>(null);
  const sidebarHydrated = useSidebarHydrated();
  const sidebarIsOpen = useSidebarToggle((state) => state.isOpen);
  const desktopSplit = sidebarHydrated && !sidebarIsOpen;

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
    if (initialMemberPanel?.dateIso === workDateIso) {
      writeCachedHomeMemberPanel(initialMemberPanel);
    }
  }, [initialMemberPanel, workDateIso]);

  useEffect(() => {
    return scheduleIdleWork(() => requestHomeBoardFullSync(), { timeout: 1200 });
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

  const visibility = useMemo(() => ({ workDateIso }), [workDateIso]);

  const consolidatedAllTasks = useMemo(
    () =>
      consolidateSecretaryBoardTasks(
        filterVisibleSecretaryBoardTasks(board.tasks, 'all', visibility),
      ),
    [board.tasks, visibility],
  );

  useEffect(() => {
    if (consolidatedAllTasks.length === 0) return;
    if (!shouldIdlePreloadSecretaryOverlays()) return;

    return scheduleIdleWork(() => {
      preloadSecretaryTaskOverlayShell();
      for (const task of consolidatedAllTasks.slice(0, 6)) {
        preloadSecretaryOverlayForTask(task);
      }
    }, { timeout: 3000 });
  }, [consolidatedAllTasks]);

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

  const homeOverlayLayers = useMemo(
    () => [
      {
        active: overlayTask !== null,
        dismiss: () => setOverlayTask(null),
      },
      {
        active: showCreateDialog,
        dismiss: () => {
          if (isPending) return;
          setShowCreateDialog(false);
          setNewTitle('');
          setNewDescription('');
        },
      },
    ],
    [overlayTask, showCreateDialog, isPending],
  );

  useMobileBackOverlayStack('home-overlay', homeOverlayLayers);

  return (
    <div
      className={cn(
        'mx-auto w-full px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)] space-y-4',
        desktopSplit ? 'max-w-6xl' : 'max-w-3xl',
      )}
    >
      <header>
        <h1 className="bb-page-title-compact text-balance">{workDateLabel}</h1>
      </header>

      {showCreateDialog ? (
        <SecretaryManualTaskDialog
          open
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
      ) : null}

      <div
        className={cn(
          'space-y-4',
          desktopSplit && 'md:grid md:grid-cols-2 md:items-start md:gap-4 md:space-y-0',
        )}
      >
        <section
          aria-label="รายการงาน"
          className={cn(BB_DATA_CARD, 'min-w-0 space-y-3 p-3 sm:p-4')}
        >
          <div className="flex flex-wrap gap-2">
            <HintTooltip tip="เพิ่มงานที่ไม่ได้มาจากระบบอัตโนมัติ">
              <button
                type="button"
                onClick={() => setShowCreateDialog(true)}
                onPointerEnter={preloadSecretaryManualTaskDialog}
                onFocus={preloadSecretaryManualTaskDialog}
                className={cn(
                  'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-foreground/85 bg-card px-3 py-2 text-[13px] font-normal text-foreground bb-shadow-sm touch-manipulation',
                  'hover:border-foreground hover:bg-muted/35',
                  BB_BTN_MOTION,
                  BB_FOCUS_RING,
                )}
              >
                <span
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xl border border-foreground/20 bg-muted/35"
                  aria-hidden
                >
                  <Plus size={14} strokeWidth={2} />
                </span>
                เพิ่มงาน
              </button>
            </HintTooltip>
          </div>

          <ul
            className={cn(
              'grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5',
              desktopSplit && 'md:grid-cols-3',
            )}
          >
            {consolidatedAllTasks.length === 0 ? (
              <li className="col-span-full list-none">
                <HomePanelEmptyState
                  compact
                  icon={<ClipboardList size={22} strokeWidth={1.5} />}
                  title="ไม่มีงานวันนี้"
                  subtitle="เพิ่มงานด้วยตนเองได้จากปุ่มด้านบน"
                />
              </li>
            ) : (
              consolidatedAllTasks.map((task) => (
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

        <HomeShiftStatusSection
          dateIso={workDateIso}
          initialPanel={
            initialMemberPanel?.dateIso === workDateIso ? initialMemberPanel : undefined
          }
          showWhenEmpty={desktopSplit}
        />
      </div>

      {overlayTask ? (
        <SecretaryTaskOverlay
          task={overlayTask}
          snapshot={board.snapshot}
          locale={locale}
          onClose={() => setOverlayTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          isPending={isPending}
        />
      ) : null}
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
