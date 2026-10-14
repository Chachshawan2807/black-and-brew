'use client';

import dynamic from 'next/dynamic';
import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ClipboardList, Plus } from '@/lib/icons';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';
import {
  BB_BTN_MOTION,
  BB_DATA_CARD,
  BB_FOCUS_RING,
} from '@/lib/ui-outlined-tokens';
import { HomePanelEmptyState } from '@/app/[locale]/_components/home-panel-primitives';
import { type HomeBoardDetailUpdate } from '@/lib/secretary/snapshot-patch';
import { createManualSecretaryTask } from '@/app/actions/home-actions';
import { buildPendingManualSecretaryTask } from '@/lib/secretary/pending-manual-task';
import {
  consolidateSecretaryBoardTasks,
  type SecretaryBoardDisplayTask,
} from '@/lib/secretary/consolidate-board-tasks';
import { filterVisibleSecretaryBoardTasks } from '@/lib/secretary/visible-board-tasks';
import {
  publishHomeSidebarPendingCount,
  requestHomeBoardFullSync,
  requestHomeBoardSnapshotHydrate,
  useHomeBoardSync,
  type BoardSyncPayload,
} from '@/hooks/use-home-board-sync';
import { resolveSnapshotScopesForBoardTasks } from '@/lib/secretary/resolve-board-hydration-scopes';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import {
  preloadSecretaryOverlayForTask,
  preloadSecretaryTaskOverlayShell,
  shouldIdlePreloadSecretaryOverlays,
} from '@/lib/secretary/preload-secretary-overlay';
import { preloadSecretaryManualTaskDialog } from '@/lib/preload-secretary-manual-task-dialog';
import { applySecretaryBoardSync } from '@/lib/secretary/apply-board-sync';
import { useMobileBackOverlayStack } from '@/hooks/use-mobile-back-overlay-stack';
import { getCachedSecretaryBoardSnapshot, subscribeSecretaryBoardCache, writeCachedSecretaryBoard } from '@/lib/secretary/home-board-cache';
import {
  isMinimalSecretaryBoardSnapshot,
  secretarySnapshotDetailIsReady,
} from '@/lib/secretary/minimal-board-snapshot';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryBoard } from '@/app/actions/home-actions';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import { HomeDashboardFrame, HomeShiftPane } from './_components/HomeDashboardFrame';
import type { HomeBoardLoadSource } from '@/lib/perf/home-board-perf';
import {
  homePerfOnBoardVisible,
  homePerfStartSession,
  registerHomeBoardPerfDevTools,
} from '@/lib/perf/home-board-perf';
import type { SecretaryTask } from '@/lib/secretary/types';
import { groupTasksIntoHomeSceneZones, type HomeSceneZoneId } from '@/lib/home-scene-zones';

const SecretaryTaskOverlay = dynamic(
  () => import('./_components/SecretaryTaskOverlay'),
  { ssr: false },
);
const HomeSceneZoneOverlay = dynamic(() => import('./_components/HomeSceneZoneOverlay'), {
  ssr: false,
});
const HomeCafeScene = dynamic(() => import('./_components/HomeCafeScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(58svh,460px)] min-h-[300px] items-center justify-center rounded-3xl border border-border bg-card text-sm text-muted-foreground">
      กำลังเตรียมฉากร้าน...
    </div>
  ),
});
const SecretaryManualTaskDialog = dynamic(
  () => import('./_components/SecretaryManualTaskDialog'),
  { ssr: false },
);

function BoardDetailStream({
  detailPromise,
  onDetail,
  onDetailSettled,
}: {
  detailPromise: Promise<HomeBoardDetailUpdate | null>;
  onDetail: (detail: HomeBoardDetailUpdate) => void;
  onDetailSettled: () => void;
}) {
  const detail = use(detailPromise);

  useEffect(() => {
    if (detail) onDetail(detail);
    onDetailSettled();
  }, [detail, onDetail, onDetailSettled]);

  return null;
}
type HomeTaskBoardProps = {
  initialBoard: SecretaryBoard;
  locale: string;
  /** Where the first paint board came from (perf diagnostics only). */
  boardLoadSource?: HomeBoardLoadSource;
  /** Cached preview while the live board is still downloading. */
  preview?: boolean;
  /** Server-started detail slices. Cards paint before this resolves. */
  detailPromise?: Promise<HomeBoardDetailUpdate | null>;
};

type HomeClientProps = HomeTaskBoardProps & {
  initialMemberPanel?: HomeMemberPanelSnapshot;
};

export function HomeTaskBoard({
  initialBoard,
  locale,
  boardLoadSource = 'ssr',
  preview = false,
  detailPromise,
}: HomeTaskBoardProps) {
  const [boardState, setBoard] = useState(initialBoard);
  const cachedBoard = useSyncExternalStore(
    subscribeSecretaryBoardCache,
    () => getCachedSecretaryBoardSnapshot(locale),
    () => null,
  );
  const board = useMemo(() => {
    if (preview || !cachedBoard) return boardState;
    if (!isMinimalSecretaryBoardSnapshot(boardState.snapshot)) return boardState;
    if (cachedBoard.snapshot.dateIso !== boardState.snapshot.dateIso) return boardState;
    if (isMinimalSecretaryBoardSnapshot(cachedBoard.snapshot)) return boardState;
    return {
      tasks: boardState.tasks,
      snapshot: cachedBoard.snapshot,
    };
  }, [boardState, cachedBoard, preview]);
  const [workDateIso, setWorkDateIso] = useState(() => initialBoard.snapshot.dateIso || todayIsoBkk());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [overlayTask, setOverlayTask] = useState<SecretaryBoardDisplayTask | null>(null);
  const [homeView, setHomeView] = useState<'3d' | '2d'>('3d');
  const [selectedZone, setSelectedZone] = useState<HomeSceneZoneId | null>(null);
  const visibility = useMemo(() => ({ workDateIso }), [workDateIso]);

  const consolidatedAllTasks = useMemo(
    () =>
      consolidateSecretaryBoardTasks(
        filterVisibleSecretaryBoardTasks(board.tasks, 'all', visibility),
      ),
    [board.tasks, visibility],
  );

  const sceneZones = useMemo(
    () => groupTasksIntoHomeSceneZones(consolidatedAllTasks),
    [consolidatedAllTasks],
  );
  const selectedZoneData = sceneZones.find((zone) => zone.id === selectedZone);
  const zoneCounts = Object.fromEntries(sceneZones.map((zone) => [zone.id, zone.activeCount])) as Record<HomeSceneZoneId, number>;

  const applyBoardSync = useCallback((payload: BoardSyncPayload) => {
    setBoard((prev) => applySecretaryBoardSync(prev, payload));
    if (payload.snapshot?.dateIso) {
      setWorkDateIso(payload.snapshot.dateIso);
    } else if (payload.snapshotPatch?.dateIso) {
      setWorkDateIso(payload.snapshotPatch.dateIso);
    }
  }, []);

  const boardRef = useRef(board);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useHomeBoardSync({
    dateIso: workDateIso,
    locale,
    onSync: applyBoardSync,
    onWorkDateChange: setWorkDateIso,
    getBaseSnapshot: () => boardRef.current.snapshot,
    getCurrentTasks: () => boardRef.current.tasks,
    getHydrationScopes: () =>
      resolveSnapshotScopesForBoardTasks(consolidatedAllTasks),
    skipInitialFullSync: true,
    enabled: !preview,
  });

  const derivedRefreshStarted = useRef(false);
  const refreshDerivedBoard = useCallback(() => {
    if (preview || derivedRefreshStarted.current) return;
    derivedRefreshStarted.current = true;
    requestHomeBoardFullSync();
  }, [preview]);

  const applyBoardDetail = useCallback((detail: HomeBoardDetailUpdate) => {
    setBoard((prev) => {
      const next = applySecretaryBoardSync(prev, {
        snapshotPatch: detail.snapshotPatch,
        snapshot: detail.snapshotPatch ? undefined : detail.snapshot,
      });
      boardRef.current = next;
      return next;
    });
    const dateIso = detail.snapshot?.dateIso ?? detail.snapshotPatch?.dateIso;
    if (dateIso) setWorkDateIso(dateIso);
  }, []);

  useEffect(() => {
    publishHomeSidebarPendingCount(board.tasks, workDateIso);
  }, [board.tasks, workDateIso]);

  useEffect(() => {
    if (preview) return;
    writeCachedSecretaryBoard(board);
  }, [board, preview]);

  useEffect(() => {
    if (detailPromise) return;
    refreshDerivedBoard();
  }, [detailPromise, refreshDerivedBoard]);

  useEffect(() => {
    if (preview) return;
    registerHomeBoardPerfDevTools();
    if (boardLoadSource === 'ssr') {
      homePerfStartSession('ssr-direct');
    }
    homePerfOnBoardVisible({
      taskCount: initialBoard.tasks.length,
      source: boardLoadSource,
    });
  }, [boardLoadSource, initialBoard.tasks.length, preview]);

  useEffect(() => {
    if (preview || detailPromise) return;
    const scopes = resolveSnapshotScopesForBoardTasks(consolidatedAllTasks);
    if (scopes.length === 0) return;
    requestHomeBoardSnapshotHydrate(scopes);
  }, [consolidatedAllTasks, detailPromise, preview]);

  useEffect(() => {
    if (preview) return;
    preloadSecretaryTaskOverlayShell();
  }, [preview]);

  useEffect(() => {
    if (preview || consolidatedAllTasks.length === 0) return;
    if (!shouldIdlePreloadSecretaryOverlays()) return;

    return scheduleIdleWork(() => {
      for (const task of consolidatedAllTasks.slice(0, 6)) {
        preloadSecretaryOverlayForTask(task);
      }
    }, { timeout: 50 });
  }, [consolidatedAllTasks, preview]);

  const warmTaskCard = useCallback(
    (task: SecretaryBoardDisplayTask) => {
      preloadSecretaryOverlayForTask(task);
      if (detailPromise || secretarySnapshotDetailIsReady(board.snapshot)) return;
      const scopes = resolveSnapshotScopesForBoardTasks([task]);
      if (scopes.length > 0) requestHomeBoardSnapshotHydrate(scopes);
    },
    [board.snapshot, detailPromise],
  );

  const handleAddTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    const description = newDescription.trim();
    const scheduledDate = workDateIso;
    const pendingId = crypto.randomUUID();

    setShowCreateDialog(false);
    setNewTitle('');
    setNewDescription('');
    setBoard((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        buildPendingManualSecretaryTask({
          id: pendingId,
          title,
          description,
          scheduledDate,
        }),
      ],
    }));

    void createManualSecretaryTask({
      title,
      description: description || undefined,
      scheduledDate,
      priority: 'normal',
    }).then((result) => {
      setBoard((prev) => ({
        ...prev,
        tasks:
          result.success && result.task
            ? prev.tasks.map((entry) => (entry.id === pendingId ? result.task! : entry))
            : prev.tasks.filter((entry) => entry.id !== pendingId),
      }));
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
        active: selectedZoneData !== undefined,
        dismiss: () => setSelectedZone(null),
      },
      {
        active: showCreateDialog,
        dismiss: () => {
          setShowCreateDialog(false);
          setNewTitle('');
          setNewDescription('');
        },
      },
    ],
    [overlayTask, selectedZoneData, showCreateDialog],
  );

  useMobileBackOverlayStack('home-overlay', homeOverlayLayers);

  if (
    !preview &&
    cachedBoard &&
    boardState.snapshot !== cachedBoard.snapshot &&
    isMinimalSecretaryBoardSnapshot(boardState.snapshot) &&
    cachedBoard.snapshot.dateIso === boardState.snapshot.dateIso &&
    !isMinimalSecretaryBoardSnapshot(cachedBoard.snapshot)
  ) {
    setBoard({
      tasks: boardState.tasks,
      snapshot: cachedBoard.snapshot,
    });
  }

  return (
    <>
      {detailPromise && !preview ? (
        <Suspense fallback={null}>
          <BoardDetailStream
            detailPromise={detailPromise}
            onDetail={applyBoardDetail}
            onDetailSettled={refreshDerivedBoard}
          />
        </Suspense>
      ) : null}
      {showCreateDialog ? (
        <SecretaryManualTaskDialog
          open
          mode="create"
          title={newTitle}
          description={newDescription}
          onTitleChange={setNewTitle}
          onDescriptionChange={setNewDescription}
          onClose={() => {
            setShowCreateDialog(false);
            setNewTitle('');
            setNewDescription('');
          }}
          onSave={handleAddTask}
        />
      ) : null}

      <section
        aria-label="รายการงาน"
        className={cn(BB_DATA_CARD, 'min-w-0 space-y-3 p-3 sm:p-4')}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="px-1 text-sm text-muted-foreground">สถานะงานในร้าน · {workDateIso}</p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={homeView === '3d'}
              onClick={() => setHomeView('3d')}
              className={cn('min-h-10 rounded-2xl border border-border px-3 text-[13px] text-foreground', homeView === '3d' ? 'bg-muted' : 'bg-card', BB_FOCUS_RING)}
            >
              ฉาก 3D
            </button>
            <button
              type="button"
              aria-pressed={homeView === '2d'}
              onClick={() => setHomeView('2d')}
              className={cn('min-h-10 rounded-2xl border border-border px-3 text-[13px] text-foreground', homeView === '2d' ? 'bg-muted' : 'bg-card', BB_FOCUS_RING)}
            >
              ข้อมูลย่อ 2D
            </button>
          </div>
        </div>
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
        {homeView === '3d' ? (
          <HomeCafeScene counts={zoneCounts} onSelectZone={setSelectedZone} />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {sceneZones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => setSelectedZone(zone.id)}
                className={cn('min-h-24 rounded-2xl border border-border bg-card p-3 text-left text-foreground', BB_FOCUS_RING)}
              >
                <span className="block text-sm">{zone.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{zone.description}</span>
                <span className="mt-2 block text-xs text-muted-foreground">ค้าง {zone.activeCount} งาน</span>
              </button>
            ))}
          </div>
        )}
        {homeView === '2d' && consolidatedAllTasks.length === 0 ? (
          <HomePanelEmptyState compact icon={<ClipboardList size={22} strokeWidth={1.5} />} title="ไม่มีงานวันนี้" subtitle="เพิ่มงานด้วยตนเองได้จากปุ่มด้านบน" />
        ) : null}
      </section>

      {selectedZoneData ? (
        <HomeSceneZoneOverlay
          zone={selectedZoneData}
          onClose={() => setSelectedZone(null)}
          onOpenTask={(task) => {
            setSelectedZone(null);
            warmTaskCard(task);
            setOverlayTask(task);
          }}
        />
      ) : null}
      {overlayTask ? (
        <SecretaryTaskOverlay
          task={overlayTask}
          snapshot={board.snapshot}
          locale={locale}
          onClose={() => setOverlayTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      ) : null}
    </>
  );
}

export default function HomeClient({
  initialBoard,
  initialMemberPanel,
  locale,
  boardLoadSource = 'ssr',
  detailPromise,
}: HomeClientProps) {
  const workDateIso = initialBoard.snapshot.dateIso || todayIsoBkk();
  return (
    <HomeDashboardFrame workDateIso={workDateIso}>
      <HomeTaskBoard
        initialBoard={initialBoard}
        locale={locale}
        boardLoadSource={boardLoadSource}
        detailPromise={detailPromise}
      />
      <HomeShiftPane
        key={workDateIso}
        dateIso={workDateIso}
        initialPanel={initialMemberPanel}
      />
    </HomeDashboardFrame>
  );
}
