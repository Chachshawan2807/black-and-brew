'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { CheckCircle2, Loader2, Plus, Sparkles } from 'lucide-react';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import {
  completeSecretaryTasks,
  createManualSecretaryTask,
  syncSecretaryAiSuggestions,
} from '@/app/actions/secretary-actions';
import { splitSecretaryCardTitle } from '@/lib/secretary/format-card-title';
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
import { loadNotificationPreferences } from '@/lib/notification-preferences';
import type { NotificationPreferences } from '@/lib/notification-types';
import { preloadPurchaseOrdersModal } from '@/lib/preload-purchase-orders-modal';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryBoard } from '@/app/actions/secretary-actions';
import type { SecretaryTask } from '@/lib/secretary/types';

const SecretaryManualTaskDialog = dynamic(
  () => import('./_components/SecretaryManualTaskDialog'),
  { ssr: false },
);

const SecretaryTaskOverlay = dynamic(
  () => import('./_components/SecretaryTaskOverlay'),
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
  inventory_accuracy: 'งานตรวจความแม่นยำคลัง',
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
  const [overlayTask, setOverlayTask] = useState<SecretaryTask | null>(null);
  const [aiAssistActive, setAiAssistActive] = useState(false);
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [aiButtonAllowed, setAiButtonAllowed] = useState(
    () => loadNotificationPreferences().secretaryAiOrdering ?? true,
  );

  useEffect(() => {
    const onPrefsChanged = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPreferences>).detail;
      const allowed = detail?.secretaryAiOrdering ?? true;
      setAiButtonAllowed(allowed);
      if (!allowed) {
        setAiAssistActive(false);
      }
    };
    window.addEventListener('bb-notification-prefs-changed', onPrefsChanged);
    return () => window.removeEventListener('bb-notification-prefs-changed', onPrefsChanged);
  }, []);

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

  const visibility = { workDateIso, isBranch2Day: board.snapshot.isBranch2Day };

  const visibleTasks = useMemo(
    () => filterConsolidatedSecretaryBoardTasks(board.tasks, moduleFilter, visibility),
    [board.tasks, moduleFilter, workDateIso, board.snapshot.isBranch2Day],
  );

  const hasPurchaseOrderTask = useMemo(
    () => visibleTasks.some((task) => task.task_type === 'inventory_reorder'),
    [visibleTasks],
  );

  useEffect(() => {
    if (!hasPurchaseOrderTask) return;

    const scheduleIdle =
      typeof requestIdleCallback === 'function'
        ? (callback: () => void) => requestIdleCallback(callback, { timeout: 2000 })
        : (callback: () => void) => window.setTimeout(callback, 400);
    const cancelIdle =
      typeof cancelIdleCallback === 'function'
        ? (id: number) => cancelIdleCallback(id)
        : (id: number) => window.clearTimeout(id);

    const id = scheduleIdle(() => preloadPurchaseOrdersModal());
    return () => cancelIdle(id);
  }, [hasPurchaseOrderTask]);

  const visibleTaskCount = useMemo(
    () => countConsolidatedSecretaryBoardTasks(board.tasks, 'all', visibility),
    [board.tasks, workDateIso, board.snapshot.isBranch2Day],
  );

  const handleInvokeAi = () => {
    setAiAssistActive(true);
    setAiAssistLoading(true);

    startTransition(async () => {
      try {
        const result = await syncSecretaryAiSuggestions({
          dateIso: workDateIso,
          locale,
          snapshot: boardRef.current.snapshot,
        });
        if (result.success && result.tasks) {
          applyBoardSync({ tasks: result.tasks, syncKind: 'full' });
        }
      } finally {
        setAiAssistLoading(false);
      }
    });
  };

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
      <header className="space-y-1">
        <HintTooltip tip="รวมงานประจำวันจากทุกโมดูล กดการ์ดเพื่อเปิดรายละเอียด">
          <h1 className="text-xl text-foreground font-normal w-fit">เลขาส่วนตัว</h1>
        </HintTooltip>
        <p className="text-[13px] text-muted-foreground">
          รวมงานจากทุกโมดูล · อัปเดตอัตโนมัติ
        </p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        {aiButtonAllowed ? (
          <HintTooltip tip="ให้ AI แนะนำงานเพิ่มจากข้อมูลปัจจุบัน (งาน AI จะอยู่ลำดับแรก)">
            <button
              type="button"
              onClick={handleInvokeAi}
              disabled={aiAssistLoading || isPending}
              aria-busy={aiAssistLoading}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] bb-transition',
                aiAssistActive
                  ? 'border-foreground/30 bg-muted/40 text-foreground'
                  : 'border-border text-foreground hover:bg-muted/30',
                (aiAssistLoading || isPending) && 'opacity-60',
              )}
            >
              {aiAssistLoading ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <Sparkles size={14} aria-hidden />
              )}
              {aiAssistActive ? 'เรียกใช้ AI อีกครั้ง' : 'เรียกใช้ AI'}
            </button>
          </HintTooltip>
        ) : null}
        <HintTooltip tip="เพิ่มงานที่ไม่ได้มาจากระบบอัตโนมัติ">
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] text-foreground"
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
          <li className="col-span-full rounded-xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">
            ไม่มีงานในตัวกรองนี้
          </li>
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDone={task.status === 'done'}
              isPending={isPending}
              onPreloadOpen={
                task.task_type === 'inventory_reorder' ? preloadPurchaseOrdersModal : undefined
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

  const cardClassName = cn(
    'relative flex aspect-square min-h-0 rounded-lg border p-2.5 bb-transition',
    isDone ? cn(PASTEL_SURFACE, 'bg-[#d4f5d4] border-[#a8e6a8]') : 'bg-card border-border',
    'hover:brightness-[0.98] cursor-pointer',
  );

  const actionButton = isDone ? (
    <HintTooltip tip="งานนี้เสร็จแล้ว">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#a8e6a8] bg-[#eef9ee] text-black/70"
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted/50 disabled:opacity-60"
      >
        <CheckCircle2 size={14} />
      </button>
    </HintTooltip>
  );

  const openTip = isDone ? 'เปิดรายละเอียดงานที่เสร็จแล้ว' : 'เปิดรายละเอียดงาน';

  const isAiSuggested = task.source_kind === 'ai_suggested';

  const body = (
    <>
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-1 overflow-y-auto pb-8 [scrollbar-width:thin]">
        {isAiSuggested ? (
          <span className="rounded-full border border-border bg-muted/40 px-1.5 py-px text-[9px] font-medium text-muted-foreground">
            AI แนะนำ
          </span>
        ) : null}
        <p
          className={cn(
            'flex w-full flex-col items-center gap-0.5 text-center text-[clamp(12px,3.2vw,14px)] leading-[1.35] tracking-[0.01em] [line-break:strict] [overflow-wrap:normal] [word-break:keep-all]',
            isDone ? 'text-black' : 'text-foreground',
          )}
        >
          {titleLines.map((line, index) => (
            <span key={`${task.id}-${index}`} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>
      <div className="absolute bottom-2 right-2 z-10">{actionButton}</div>
    </>
  );

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={handleCardKeyDown}
          onPointerEnter={warmOverlayChunk}
          onFocus={warmOverlayChunk}
          onPointerDown={warmOverlayChunk}
          aria-label={`เปิดรายละเอียดงาน ${task.title}`}
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
          'rounded-full border px-3 py-1 text-[12px] bb-transition',
          active
            ? 'border-foreground bg-foreground text-background'
            : 'border-border text-muted-foreground hover:text-foreground',
        )}
      >
        {label}
      </button>
    </HintTooltip>
  );
}
