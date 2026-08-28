'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { CheckCircle2, Play, Plus, Square } from 'lucide-react';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import SecretaryGuidanceBar from './_components/SecretaryGuidanceBar';
import SecretaryTaskOverlay from './_components/SecretaryTaskOverlay';
import {
  createManualSecretaryTask,
  startSecretaryTask,
  stopSecretaryTask,
} from '@/app/actions/secretary-actions';
import { splitSecretaryCardTitle } from '@/lib/secretary/format-card-title';
import { mergeSecretarySnapshot } from '@/lib/secretary/snapshot-patch';
import { formatTaskActualDurationLabel } from '@/lib/secretary/task-duration';
import {
  countSecretaryBoardTasksByModule,
  filterVisibleSecretaryBoardTasks,
} from '@/lib/secretary/visible-board-tasks';
import { useSecretaryBoardSync, type BoardSyncPayload } from '@/hooks/use-secretary-board-sync';
import { useSecretaryGuidance } from '@/hooks/use-secretary-guidance';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryBoard } from '@/app/actions/secretary-actions';
import type { SecretaryTask } from '@/lib/secretary/types';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const [overlayTask, setOverlayTask] = useState<SecretaryTask | null>(null);

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
  });

  const guidance = useSecretaryGuidance({
    tasks: board.tasks,
    snapshot: board.snapshot,
  });

  const visibleTasks = useMemo(
    () => filterVisibleSecretaryBoardTasks(board.tasks, moduleFilter),
    [board.tasks, moduleFilter],
  );

  const visibleTaskCount = useMemo(
    () => filterVisibleSecretaryBoardTasks(board.tasks, 'all').length,
    [board.tasks],
  );

  const handleStart = (taskId: string) => {
    startTransition(async () => {
      const result = await startSecretaryTask(taskId);
      if (!result.success || !result.task) return;
      setBoard((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) => (task.id === taskId ? result.task! : task)),
      }));
    });
  };

  const handleStop = (taskId: string) => {
    startTransition(async () => {
      const result = await stopSecretaryTask(taskId);
      if (!result.success || !result.task) return;
      setBoard((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) => (task.id === taskId ? result.task! : task)),
      }));
    });
  };

  const handleAddTask = () => {
    const title = newTitle.trim();
    if (!title) return;

    startTransition(async () => {
      const result = await createManualSecretaryTask({
        title,
        scheduledDate: workDateIso,
        priority: 'normal',
      });
      if (!result.success || !result.task) return;

      setBoard((prev) => ({ ...prev, tasks: [...prev.tasks, result.task!] }));
      setNewTitle('');
      setShowAddForm(false);
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)] space-y-5">
      <header className="space-y-1">
        <HintTooltip tip="รวมงานประจำวันจากทุกโมดูล — กดการ์ดเพื่อเปิดรายละเอียด">
          <h1 className="text-xl text-foreground font-normal w-fit">เลขาส่วนตัว</h1>
        </HintTooltip>
        <p className="text-[13px] text-muted-foreground">
          รวมงานจากทุกโมดูล · อัปเดตอัตโนมัติ
        </p>
      </header>

      <SecretaryGuidanceBar text={guidance.text} loading={guidance.loading} />

      {board.snapshot.isBranch2Day ? (
        <HintTooltip tip="วันนี้มีกะไปสาขา 2 — ใช้เมนูเบิกของสาขา 2 ในคลังได้ตามปกติ">
          <div
            className={cn(
              'rounded-2xl px-4 py-3 border border-[#a8e6a8] w-fit max-w-full',
              `${PASTEL_SURFACE} bg-[#d4f5d4]`,
            )}
          >
            <p className="text-[14px] text-black font-normal">วันไปสาขา 2</p>
            <p className="text-[12px] text-black/80 mt-0.5">
              {board.snapshot.branch2Remark ?? 'คั่วและนำของ — เบิก/รับใช้หน้าคลังที่มีอยู่'}
            </p>
          </div>
        </HintTooltip>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        <HintTooltip tip="เพิ่มงานที่ไม่ได้มาจากระบบอัตโนมัติ">
          <button
            type="button"
            onClick={() => setShowAddForm((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] text-foreground"
          >
            <Plus size={14} />
            เพิ่มงาน
          </button>
        </HintTooltip>
      </div>

      {showAddForm ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="ชื่องาน"
            title="ชื่องานที่ต้องการเพิ่ม"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[14px] text-foreground"
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAddTask();
            }}
          />
          <HintTooltip tip="บันทึกงานใหม่ลงบอร์ดวันนี้">
            <button
              type="button"
              onClick={handleAddTask}
              disabled={isPending || !newTitle.trim()}
              className="rounded-xl bg-foreground text-background px-4 py-2 text-[13px] disabled:opacity-60"
            >
              บันทึก
            </button>
          </HintTooltip>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={moduleFilter === 'all'}
          onClick={() => setModuleFilter('all')}
          label={`ทั้งหมด (${visibleTaskCount})`}
          tip="แสดงงานทุกโมดูล รวมงานที่เสร็จแล้ว"
        />
        {(Object.keys(MODULE_LABELS) as SecretaryTask['module'][]).map((module) => {
          const count = countSecretaryBoardTasksByModule(board.tasks, module);
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

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleTasks.length === 0 ? (
          <li className="col-span-full rounded-xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">
            ไม่มีงานในตัวกรองนี้
          </li>
        ) : (
          visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isActive={task.status === 'in_progress' && Boolean(task.active_session_started_at)}
              isDone={task.status === 'done'}
              isPending={isPending}
              onOpen={() => setOverlayTask(task)}
              onStart={() => handleStart(task.id)}
              onStop={() => handleStop(task.id)}
            />
          ))
        )}
      </ul>

      <SecretaryTaskOverlay
        task={overlayTask}
        snapshot={board.snapshot}
        locale={locale}
        onClose={() => setOverlayTask(null)}
      />
    </div>
  );
}

function TaskCard({
  task,
  isActive,
  isDone,
  isPending,
  onOpen,
  onStart,
  onStop,
}: {
  task: SecretaryTask;
  isActive: boolean;
  isDone: boolean;
  isPending: boolean;
  onOpen: () => void;
  onStart: () => void;
  onStop: () => void;
}) {
  const titleLines = splitSecretaryCardTitle(task.title);
  const durationLabel = formatTaskActualDurationLabel(task.metadata);

  const cardClassName = cn(
    'relative flex aspect-square min-h-0 rounded-xl border p-4 bb-transition',
    isDone
      ? cn(PASTEL_SURFACE, 'bg-[#d4f5d4] border-[#a8e6a8]')
      : 'bg-card',
    !isDone && isActive ? 'border-foreground/50 ring-1 ring-foreground/20' : !isDone ? 'border-border' : '',
    'hover:brightness-[0.98] cursor-pointer',
  );

  const actionButton = isDone ? (
    <HintTooltip tip="งานนี้เสร็จแล้ว">
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#a8e6a8] bg-[#eef9ee] text-black/70"
        aria-hidden
      >
        <CheckCircle2 size={16} />
      </span>
    </HintTooltip>
  ) : task.status === 'in_progress' ? (
    <HintTooltip tip="บันทึกเวลาและทำเครื่องหมายว่าเสร็จงาน">
      <button
        type="button"
        aria-label={`เสร็จงาน ${task.title}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onStop();
        }}
        disabled={isPending}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted/50 disabled:opacity-60"
      >
        <Square size={14} />
      </button>
    </HintTooltip>
  ) : (
    <HintTooltip tip="เริ่มจับเวลาทำงานนี้">
      <button
        type="button"
        aria-label={`เริ่มงาน ${task.title}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onStart();
        }}
        disabled={isPending}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground hover:bg-muted/50 disabled:opacity-60"
      >
        <Play size={16} />
      </button>
    </HintTooltip>
  );

  const openTip = isDone
    ? 'เปิดรายละเอียดงานที่เสร็จแล้ว'
    : isActive
      ? 'เปิดรายละเอียดงานที่กำลังทำ'
      : 'เปิดรายละเอียดงาน';

  const body = (
    <>
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 overflow-y-auto pb-11 [scrollbar-width:thin]">
        <p
          className={cn(
            'flex w-full flex-col items-center gap-1 text-center text-[clamp(15px,4.2vw,18px)] leading-[1.45] tracking-[0.01em] [line-break:strict] [overflow-wrap:normal] [word-break:keep-all]',
            isDone ? 'text-black' : 'text-foreground',
          )}
        >
          {titleLines.map((line, index) => (
            <span key={`${task.id}-${index}`} className="block">
              {line}
            </span>
          ))}
        </p>
        {isDone && durationLabel ? (
          <p className="text-[11px] leading-snug text-black/75 tabular-nums">{durationLabel}</p>
        ) : null}
      </div>
      <div className="absolute bottom-3 right-3 z-10">{actionButton}</div>
    </>
  );

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <li className="min-h-0">
      <HintTooltip tip={openTip}>
        <div
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={handleCardKeyDown}
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
