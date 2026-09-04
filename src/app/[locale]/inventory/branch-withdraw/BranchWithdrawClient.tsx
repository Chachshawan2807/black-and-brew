'use client';

import Link from 'next/link';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingIcon } from '@/components/ui/loading-icon';
import { ChevronLeft, Copy, Eye, PackagePlus, Plus, Save, Search } from '@/lib/icons';
import { CloseIcon } from '@/components/ui/close-icon';
import {
  saveBranchWithdrawal,
  type BranchWithdrawHistoryRow,
} from '@/app/actions/branch-withdraw-actions';
import {
  buildBranchWithdrawDraftLines,
  clearBranchWithdrawDraft,
  emptyDraftRow,
  mergeRowsWithDisplayItemIds,
  readBranchWithdrawDraftFromBrowser,
  saveBranchWithdrawDraftCheckpoint,
  serializeBranchWithdrawDraft,
  writeBranchWithdrawDraft,
  type BranchWithdrawDraftRow,
} from '@/lib/inventory-branch-withdraw-draft';
import { useInventoryRealtime, type InventoryRealtimeItem } from '@/contexts/InventoryRealtimeContext';
import { filterInventoryGridItems } from '@/lib/inventory-grid-search';
import {
  buildBranchWithdrawDisplayItems,
  getAvailableBranchWithdrawPickItems,
  type BranchWithdrawDisplayItem,
} from '@/lib/inventory-branch-withdraw-items';
import { formatInventoryNumericDisplay } from '@/lib/inventory-stock';
import {
  filterBranchWithdrawSaveLines,
  formatBranchWithdrawLineMessage,
} from '@/lib/inventory-branch-withdraw-format';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';
import { getClientSessionId } from '@/lib/client-session';
import { useMaxMd } from '@/hooks/use-max-md';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import { buildBranchWithdrawStandaloneMobileShellStyle } from '@/lib/branch-withdraw-mobile-shell';
import { cn } from '@/lib/utils';
import {
  BRANCH_WITHDRAW_ACTION_BAR_CLASS,
  BRANCH_WITHDRAW_SCROLL_BODY_CLASS,
  BRANCH_WITHDRAW_STANDALONE_DESKTOP_SHELL_CLASS,
  BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS,
} from './branch-withdraw-layout';

type Item = BranchWithdrawDisplayItem;
type Props = {
  initialItems: InventoryRealtimeItem[];
  initialHistory: BranchWithdrawHistoryRow[];
  locale: string;
  embedded?: boolean;
  /** True while the full inventory catalog is still loading in an embedded overlay. */
  catalogLoading?: boolean;
};

function sanitizeQtyInput(raw: string): string {
  const digitsOnly = raw.replace(/[^0-9]/g, '');
  if (digitsOnly === '') return '';
  return digitsOnly.replace(/^0+(?=\d)/, '');
}

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const BRANCH2_UNIT_LABEL = 'หน่วยสาขา 2';
const BRANCH_WITHDRAW_HISTORY_INITIAL_COUNT = 3;
const DESKTOP_GRID_COLS =
  'md:grid-cols-[minmax(0,1fr)_4.25rem_4.25rem_minmax(6.75rem,8.5rem)]';
const INPUT_LABEL_CLASS =
  'text-center text-[10px] font-normal leading-tight text-muted-foreground md:text-xs';
const INPUT_FOCUS_CLASS =
  'outline-none focus:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10 focus:bg-card bb-transition';
const INPUT_FIELD_CLASS = cn(
  'h-10 w-full min-w-0 rounded-xl border border-border bg-background px-1 text-center text-sm tabular-nums md:h-9 md:px-2',
  INPUT_FOCUS_CLASS,
);
const UNIT_INPUT_FIELD_CLASS = cn(
  INPUT_FIELD_CLASS,
  'placeholder:text-[10px] placeholder:leading-tight md:placeholder:text-xs',
);
const MOBILE_INPUT_GRID_CLASS = 'grid grid-cols-3 gap-1.5 md:contents';
const BRANCH_WITHDRAW_DIALOG_BASE_CLASS =
  'm-auto max-h-[min(85dvh,100%)] overscroll-contain rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40 open:animate-in open:fade-in-0 open:zoom-in-95 motion-reduce:open:animate-none';
const BRANCH_WITHDRAW_DIALOG_PREVIEW_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-fit max-w-[92vw]`;
const BRANCH_WITHDRAW_DIALOG_WIDE_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-[min(780px,92vw)]`;
const BRANCH_WITHDRAW_DIALOG_HISTORY_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-[92vw] md:w-[min(560px,92vw)]`;
const BRANCH_WITHDRAW_DIALOG_NARROW_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-[min(480px,92vw)]`;
const DIALOG_TITLE_CLASS = 'min-w-0 text-base font-normal text-balance text-foreground';
const DIALOG_SUBTITLE_CLASS = 'mt-1 text-xs leading-relaxed text-muted-foreground';
const DIALOG_FOOTER_CLASS = 'mt-4 flex flex-wrap items-center justify-end gap-2';
const STICKY_ACTION_BUTTON_CLASS =
  'flex h-11 min-h-[44px] min-w-0 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-2 text-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-50 md:gap-2 md:px-4 md:text-sm';
const STICKY_ACTION_PRIMARY_CLASS = cn(
  STICKY_ACTION_BUTTON_CLASS,
  'border-foreground bg-foreground text-background hover:bg-foreground/90 hover:opacity-95',
);
const ADD_FROM_CATALOG_BUTTON_CLASS =
  'inline-flex w-full min-h-[44px] touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-foreground/20 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto';
const DIALOG_CLOSE_BUTTON_CLASS =
  'inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15';
const DIALOG_SECONDARY_BUTTON_CLASS =
  'inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15';
const ADD_FROM_CATALOG_BAR_CLASS = 'shrink-0 bg-background pb-3';
const COPY_ICON_BUTTON_CLASS =
  'inline-flex min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-xl border border-border bg-background p-2 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-50';
const ITEM_ROW_BADGE_CLASS =
  'inline-flex rounded-md border border-border bg-background px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground md:text-xs';
const DESKTOP_COLUMN_HEADER_CLASS =
  'sticky top-0 z-10 hidden gap-x-2 rounded-xl border border-transparent bg-background/95 px-4 py-2 text-xs font-normal text-muted-foreground backdrop-blur-sm md:grid';

function WithdrawRowInputs({
  itemId,
  row,
  onQtyBranch1,
  onQtyBranch2,
  onBranch2Unit,
}: {
  itemId: string;
  row: BranchWithdrawDraftRow;
  onQtyBranch1: (value: string) => void;
  onQtyBranch2: (value: string) => void;
  onBranch2Unit: (value: string) => void;
}) {
  return (
    <>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={INPUT_LABEL_CLASS}>สาขา 1</span>
        <input
          type="text"
          inputMode="numeric"
          name={`branch-withdraw-${itemId}-qty1`}
          aria-label="จำนวนสาขา 1"
          value={row.qtyBranch1}
          onChange={(event) => onQtyBranch1(sanitizeQtyInput(event.target.value))}
          className={INPUT_FIELD_CLASS}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={INPUT_LABEL_CLASS}>สาขา 2</span>
        <input
          type="text"
          inputMode="numeric"
          name={`branch-withdraw-${itemId}-qty2`}
          aria-label="จำนวนสาขา 2"
          value={row.qtyBranch2}
          onChange={(event) => onQtyBranch2(sanitizeQtyInput(event.target.value))}
          className={INPUT_FIELD_CLASS}
        />
      </label>
      <label className="flex min-w-0 flex-col gap-1">
        <span className={INPUT_LABEL_CLASS}>
          <span className="md:hidden">หน่วย</span>
          <span className="hidden md:inline">{BRANCH2_UNIT_LABEL}</span>
        </span>
        <input
          type="text"
          name={`branch-withdraw-${itemId}-unit2`}
          aria-label="หน่วยสาขา 2"
          value={row.branch2Unit}
          onChange={(event) => onBranch2Unit(event.target.value)}
          className={UNIT_INPUT_FIELD_CLASS}
          placeholder="หน่วย"
        />
      </label>
    </>
  );
}

type BranchWithdrawItemRowProps = {
  item: Item;
  row: BranchWithdrawDraftRow;
  onUpdateRow: (itemId: string, patch: Partial<BranchWithdrawDraftRow>) => void;
  onRemoveManualItem: (itemId: string) => void;
};

function branchWithdrawItemRowPropsEqual(
  prev: BranchWithdrawItemRowProps,
  next: BranchWithdrawItemRowProps,
): boolean {
  return (
    prev.row === next.row &&
    prev.onUpdateRow === next.onUpdateRow &&
    prev.onRemoveManualItem === next.onRemoveManualItem &&
    prev.item.id === next.item.id &&
    prev.item.name === next.item.name &&
    prev.item.unit === next.item.unit &&
    prev.item.stock === next.item.stock &&
    prev.item.computedOrderQty === next.item.computedOrderQty &&
    prev.item.isManual === next.item.isManual &&
    prev.item.sort_order === next.item.sort_order
  );
}

const BranchWithdrawItemRow = memo(function BranchWithdrawItemRow({
  item,
  row,
  onUpdateRow,
  onRemoveManualItem,
}: BranchWithdrawItemRowProps) {
  const handleQtyBranch1 = useCallback(
    (value: string) => onUpdateRow(item.id, { qtyBranch1: value }),
    [item.id, onUpdateRow],
  );
  const handleQtyBranch2 = useCallback(
    (value: string) => onUpdateRow(item.id, { qtyBranch2: value }),
    [item.id, onUpdateRow],
  );
  const handleBranch2Unit = useCallback(
    (value: string) => onUpdateRow(item.id, { branch2Unit: value }),
    [item.id, onUpdateRow],
  );
  const handleRemove = useCallback(
    () => onRemoveManualItem(item.id),
    [item.id, onRemoveManualItem],
  );

  return (
    <article className="rounded-2xl border border-border bg-card p-3.5 transition-colors md:p-4">
      <div className={`flex flex-col gap-3 md:grid md:items-end md:gap-x-2 ${DESKTOP_GRID_COLS}`}>
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <div className={ITEM_ROW_BADGE_CLASS}>
              {String(item.sort_order ?? 0).padStart(2, '0')}
            </div>
            {item.isManual ? (
              <span className={ITEM_ROW_BADGE_CLASS}>เพิ่มจากคลัง</span>
            ) : null}
            {item.isManual ? (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex min-h-[32px] touch-manipulation items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 md:text-xs"
                aria-label={`ลบ ${item.name} ออกจากรายการ`}
              >
                <CloseIcon size="xs" />
                <span>ลบ</span>
              </button>
            ) : null}
          </div>
          <p className="text-[15px] leading-snug text-foreground md:text-base">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            หน่วย (สาขา 1): {item.unit || '-'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.isManual ? (
              <>
                ไม่อยู่ในรายการสั่งซื้อสาขา 2
                <span className="mx-1.5 text-foreground/30">·</span>
              </>
            ) : (
              <>
                จำนวนสั่งซื้อ:{' '}
                <span className="tabular-nums text-foreground">
                  {formatInventoryNumericDisplay(item.computedOrderQty)}
                </span>
                <span className="mx-1.5 text-foreground/30">·</span>
              </>
            )}
            คงเหลือในสต็อก:{' '}
            <span className="tabular-nums text-foreground">
              {formatInventoryNumericDisplay(item.stock)}
            </span>
          </p>
        </div>

        <div className={MOBILE_INPUT_GRID_CLASS}>
          <WithdrawRowInputs
            itemId={item.id}
            row={row}
            onQtyBranch1={handleQtyBranch1}
            onQtyBranch2={handleQtyBranch2}
            onBranch2Unit={handleBranch2Unit}
          />
        </div>
      </div>
    </article>
  );
}, branchWithdrawItemRowPropsEqual);

export default function BranchWithdrawClient({
  initialItems,
  initialHistory,
  locale,
  embedded = false,
  catalogLoading = false,
}: Props) {
  const isReadOnly = useReadOnly();
  const isMaxMd = useMaxMd();
  const viewportInsets = useVisualViewportInsets(!embedded);
  const { items: realtimeItems, hasLoaded, refresh } = useInventoryRealtime();

  const standaloneMobileShellStyle = useMemo(
    () =>
      buildBranchWithdrawStandaloneMobileShellStyle({
        embedded,
        isMaxMd,
        viewportInsets,
      }),
    [embedded, isMaxMd, viewportInsets],
  );

  const inventorySource = hasLoaded ? realtimeItems : initialItems;

  const [extraItemIds, setExtraItemIds] = useState<string[]>(() => {
    const draft = readBranchWithdrawDraftFromBrowser();
    return draft?.extraItemIds ?? [];
  });

  const displayItems = useMemo(
    () => buildBranchWithdrawDisplayItems(inventorySource, extraItemIds),
    [extraItemIds, inventorySource],
  );

  const [rows, setRows] = useState<Record<string, BranchWithdrawDraftRow>>(() => {
    const itemIds = displayItems.map((item) => item.id);
    if (typeof window === 'undefined') {
      return mergeRowsWithDisplayItemIds(itemIds, {});
    }
    const draft = readBranchWithdrawDraftFromBrowser();
    return mergeRowsWithDisplayItemIds(itemIds, draft?.rows ?? {});
  });
  const [isReceiving, setIsReceiving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState<string | null>(() => {
    const draft = readBranchWithdrawDraftFromBrowser();
    if (!draft?.savedAt) return null;
    return `บันทึกชั่วคราวล่าสุด ${formatHistoryDate(draft.savedAt)}`;
  });
  const [history, setHistory] = useState(initialHistory);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [prevInitialHistory, setPrevInitialHistory] = useState(initialHistory);
  if (initialHistory !== prevInitialHistory) {
    setPrevInitialHistory(initialHistory);
    setHistory(initialHistory);
    setHistoryExpanded(false);
  }

  const [saveLineMessage, setSaveLineMessage] = useState('');
  const [lineMessageDialog, setLineMessageDialog] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [previewCopyStatus, setPreviewCopyStatus] = useState<string | null>(null);
  const [historyCopyStatus, setHistoryCopyStatus] = useState<string | null>(null);

  const [addItemQuery, setAddItemQuery] = useState('');

  const saveResultDialogRef = useRef<HTMLDialogElement | null>(null);
  const previewDialogRef = useRef<HTMLDialogElement | null>(null);
  const historyLineDialogRef = useRef<HTMLDialogElement | null>(null);
  const addItemDialogRef = useRef<HTMLDialogElement | null>(null);
  const draftPersistSignatureRef = useRef<string | null>(null);

  const displayItemIdKey = useMemo(
    () => displayItems.map((item) => item.id).join('\0'),
    [displayItems],
  );

  const [prevDisplayItemIdKey, setPrevDisplayItemIdKey] = useState(displayItemIdKey);
  if (displayItemIdKey !== prevDisplayItemIdKey) {
    setPrevDisplayItemIdKey(displayItemIdKey);
    const itemIds = displayItemIdKey ? displayItemIdKey.split('\0') : [];
    setRows((prev) => mergeRowsWithDisplayItemIds(itemIds, prev));
  }

  const visibleHistory = useMemo(() => {
    if (historyExpanded || history.length <= BRANCH_WITHDRAW_HISTORY_INITIAL_COUNT) {
      return history;
    }
    return history.slice(0, BRANCH_WITHDRAW_HISTORY_INITIAL_COUNT);
  }, [history, historyExpanded]);

  const hasMoreWithdrawalHistory =
    history.length > BRANCH_WITHDRAW_HISTORY_INITIAL_COUNT && !historyExpanded;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const serialized = serializeBranchWithdrawDraft({ rows, extraItemIds });
    if (draftPersistSignatureRef.current === serialized) return;
    draftPersistSignatureRef.current = serialized;
    writeBranchWithdrawDraft(window.localStorage, { rows, extraItemIds });
  }, [extraItemIds, rows]);

  const displayedItemIds = useMemo(() => new Set(displayItemIdKey.split('\0').filter(Boolean)), [displayItemIdKey]);

  const availablePickItems = useMemo(
    () => getAvailableBranchWithdrawPickItems(inventorySource, displayedItemIds),
    [displayedItemIds, inventorySource],
  );

  const filteredPickItems = useMemo(
    () => filterInventoryGridItems(availablePickItems, addItemQuery),
    [addItemQuery, availablePickItems],
  );

  const previewSummary = useMemo(() => {
    const filtered = filterBranchWithdrawSaveLines(buildBranchWithdrawDraftLines(displayItems, rows));
    return {
      message: formatBranchWithdrawLineMessage(filtered),
      count: filtered.length,
    };
  }, [displayItems, rows]);

  const previewLineMessage = previewSummary.message;
  const previewLineCount = previewSummary.count;

  const updateRow = useCallback(
    (itemId: string, patch: Partial<BranchWithdrawDraftRow>) => {
      setRows((prev) => ({
        ...prev,
        [itemId]: {
          ...(prev[itemId] ?? emptyDraftRow()),
          ...patch,
        },
      }));
    },
    [],
  );

  const openDialog = (dialog: HTMLDialogElement | null) => {
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }
  };

  const closeDialog = (dialog: HTMLDialogElement | null) => {
    if (!dialog) return;
    if (dialog.open) {
      dialog.close();
    }
  };

  const handleSaveDraft = useCallback(() => {
    if (isReadOnly) {
      setSaveError(READ_ONLY_DENY_MSG);
      return;
    }

    const savedLines = filterBranchWithdrawSaveLines(
      buildBranchWithdrawDraftLines(displayItems, rows),
    );
    if (savedLines.length === 0) {
      setSaveError('ไม่มีรายการที่มีจำนวนสาขา 1');
      return;
    }

    if (typeof window === 'undefined') return;

    setSaveError(null);
    const checkpoint = saveBranchWithdrawDraftCheckpoint(window.localStorage, {
      rows,
      extraItemIds,
    });
    draftPersistSignatureRef.current = serializeBranchWithdrawDraft(checkpoint);
    setDraftSaveStatus(`บันทึกชั่วคราวแล้ว ${formatHistoryDate(checkpoint.savedAt ?? new Date().toISOString())}`);
  }, [displayItems, extraItemIds, isReadOnly, rows]);

  const handleReceive = useCallback(async () => {
    if (isReadOnly) {
      setSaveError(READ_ONLY_DENY_MSG);
      return;
    }

    setIsReceiving(true);
    setSaveError(null);
    setCopyStatus(null);

    try {
      const lines = buildBranchWithdrawDraftLines(displayItems, rows);
      const savedLines = filterBranchWithdrawSaveLines(lines);

      const result = await saveBranchWithdrawal({
        lines: savedLines.map((line) => ({
          itemId: line.itemId,
          name: line.name,
          qtyBranch1: String(line.qtyBranch1),
          qtyBranch2: line.qtyBranch2 != null ? String(line.qtyBranch2) : '',
          branch2Unit: line.branch2Unit ?? '',
        })),
        clientSessionId: getClientSessionId(),
      });
      if (!result.success) {
        setSaveError(result.error || 'รับเข้าไม่สำเร็จ');
        return;
      }

      if (typeof window !== 'undefined') {
        clearBranchWithdrawDraft(window.localStorage);
        clearBranchWithdrawDraft(window.sessionStorage);
        draftPersistSignatureRef.current = null;
      }
      setExtraItemIds([]);
      setDraftSaveStatus(null);
      const resetItemIds = buildBranchWithdrawDisplayItems(inventorySource, []).map((item) => item.id);
      setRows(mergeRowsWithDisplayItemIds(resetItemIds, {}));

      if (result.withdrawalId) {
        setHistory((prev) => [
          {
            id: result.withdrawalId,
            line_message: result.lineMessage,
            line_count: savedLines.length,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      setSaveLineMessage(result.lineMessage);
      openDialog(saveResultDialogRef.current);

      void refresh({ soft: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการรับเข้าคลัง';
      setSaveError(message);
    } finally {
      setIsReceiving(false);
    }
  }, [inventorySource, isReadOnly, refresh, rows, displayItems]);

  const closeAddItemDialog = useCallback(() => {
    closeDialog(addItemDialogRef.current);
    setAddItemQuery('');
  }, []);

  const handleAddItemDialogClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    const dialog = addItemDialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const clickedInDialogPanel =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!clickedInDialogPanel) {
      closeAddItemDialog();
    }
  }, [closeAddItemDialog]);

  const openAddItemDialog = useCallback(() => {
    setAddItemQuery('');
    openDialog(addItemDialogRef.current);
  }, []);

  const handleAddItem = useCallback((itemId: string) => {
    setExtraItemIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
    closeAddItemDialog();
  }, [closeAddItemDialog]);

  const handleRemoveManualItem = useCallback((itemId: string) => {
    setExtraItemIds((prev) => prev.filter((id) => id !== itemId));
    setRows((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, []);

  const handleCopyLineMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(saveLineMessage);
      setCopyStatus('คัดลอกแล้ว');
    } catch {
      setCopyStatus('คัดลอกไม่สำเร็จ');
    }
  }, [saveLineMessage]);

  const handleCopyPreview = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(previewLineMessage);
      setPreviewCopyStatus('คัดลอกแล้ว');
    } catch {
      setPreviewCopyStatus('คัดลอกไม่สำเร็จ');
    }
  }, [previewLineMessage]);

  const handleCopyHistoryLine = useCallback(async () => {
    if (!lineMessageDialog?.message) return;
    try {
      await navigator.clipboard.writeText(lineMessageDialog.message);
      setHistoryCopyStatus('คัดลอกแล้ว');
    } catch {
      setHistoryCopyStatus('คัดลอกไม่สำเร็จ');
    }
  }, [lineMessageDialog]);

  const openPreviewDialog = useCallback(() => {
    setPreviewCopyStatus(null);
    openDialog(previewDialogRef.current);
  }, []);

  const openHistoryLineDialog = useCallback((entry: BranchWithdrawHistoryRow) => {
    setHistoryCopyStatus(null);
    setLineMessageDialog({ title: `สรุปรายการ (${formatHistoryDate(entry.created_at)})`, message: entry.line_message });
    openDialog(historyLineDialogRef.current);
  }, []);

  const closeHistoryLineDialog = useCallback(() => {
    closeDialog(historyLineDialogRef.current);
  }, []);

  const handleHistoryLineDialogClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    const dialog = historyLineDialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const clickedInDialogPanel =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!clickedInDialogPanel) {
      closeHistoryLineDialog();
    }
  }, [closeHistoryLineDialog]);

  const actionBar = (
    <div className={BRANCH_WITHDRAW_ACTION_BAR_CLASS}>
      <div className="flex flex-row gap-2">
        <button
          type="button"
          onClick={openPreviewDialog}
          disabled={previewLineCount === 0}
          className={STICKY_ACTION_BUTTON_CLASS}
        >
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">สรุป</span>
          {previewLineCount > 0 ? (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs tabular-nums">
              {previewLineCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isReadOnly || previewLineCount === 0}
          className={STICKY_ACTION_BUTTON_CLASS}
        >
          <Save className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">บันทึก</span>
        </button>
        <button
          type="button"
          onClick={() => void handleReceive()}
          disabled={isReadOnly || isReceiving || previewLineCount === 0}
          className={STICKY_ACTION_PRIMARY_CLASS}
        >
          {isReceiving ? (
            <>
              <LoadingIcon size="md" className="shrink-0" />
              <span className="truncate">กำลังรับเข้า…</span>
            </>
          ) : (
            <>
              <PackagePlus className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">รับเข้า</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  const addFromCatalogButton = (
    <button
      type="button"
      onClick={openAddItemDialog}
      disabled={catalogLoading || availablePickItems.length === 0}
      className={ADD_FROM_CATALOG_BUTTON_CLASS}
    >
      <Plus className="h-4 w-4" />
      <span>เพิ่มรายการจากคลังสินค้า</span>
    </button>
  );

  const addFromCatalogBar = (
    <div className={cn(ADD_FROM_CATALOG_BAR_CLASS, embedded && 'pr-12 pt-1')}>
      {addFromCatalogButton}
    </div>
  );

  const scrollableSections = (
    <>
        {saveError ? (
          <div
            className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] px-4 py-3 text-sm text-foreground dark:border-red-900/40 dark:bg-red-950/30"
            role="alert"
          >
            {saveError}
          </div>
        ) : null}

        {draftSaveStatus ? (
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {draftSaveStatus}
          </div>
        ) : null}

        <section className="space-y-2">
          {displayItems.length === 0 ? (
            <EmptyState>
              ไม่มีรายการสั่งซื้อจากสาขา 2 ที่ต้องเบิกในขณะนี้ กดปุ่มด้านบนเพื่อเพิ่มสินค้าจากคลัง
            </EmptyState>
          ) : (
            <>
              <div className={`${DESKTOP_COLUMN_HEADER_CLASS} ${DESKTOP_GRID_COLS}`}>
                <span>รายการ</span>
                <span className="text-center">สาขา 1</span>
                <span className="text-center">สาขา 2</span>
                <span className="text-center leading-tight">{BRANCH2_UNIT_LABEL}</span>
              </div>
              {displayItems.map((item) => (
                <BranchWithdrawItemRow
                  key={item.id}
                  item={item}
                  row={rows[item.id] ?? emptyDraftRow()}
                  onUpdateRow={updateRow}
                  onRemoveManualItem={handleRemoveManualItem}
                />
              ))}
            </>
          )}
        </section>

        {actionBar}

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-normal text-balance text-foreground md:text-lg">
              ประวัติการเบิก
            </h2>
            {history.length > 0 ? (
              <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                {history.length} รายการ
              </span>
            ) : null}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการเบิกสาขา 2</p>
          ) : (
            <div className="space-y-2">
              {visibleHistory.map((entry) => (
                <article
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:bg-muted/20 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{formatHistoryDate(entry.created_at)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      จำนวนรายการ: {entry.line_count}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openHistoryLineDialog(entry)}
                    className="inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-1.5 self-start rounded-xl border border-border bg-card px-3 py-2 text-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 md:self-auto"
                  >
                    <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    สรุป
                  </button>
                </article>
              ))}
              {hasMoreWithdrawalHistory ? (
                <button
                  type="button"
                  onClick={() => setHistoryExpanded(true)}
                  className="w-full min-h-[44px] touch-manipulation rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
                >
                  ดูเพิ่มเติม
                </button>
              ) : null}
            </div>
          )}
        </section>
    </>
  );

  return (
    <div
      className={
        embedded
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground'
          : cn(
              'flex min-h-0 flex-col overflow-hidden bg-background px-4 pb-4 text-foreground max-md:pt-0 md:p-8',
              BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS,
              BRANCH_WITHDRAW_STANDALONE_DESKTOP_SHELL_CLASS,
            )
      }
      style={standaloneMobileShellStyle}
    >
      <div
        className={
          embedded
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden'
        }
      >
        {embedded ? (
          <header className="shrink-0 pb-2 pr-12 pt-0.5">
            <h2 className="text-base font-normal text-balance text-foreground">เบิกของสาขา 2</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              กรอกจำนวนเบิก แล้วกดรับเข้าเพื่ออัปเดตคลัง
            </p>
          </header>
        ) : (
          <header className="flex shrink-0 items-center justify-between pb-3 max-md:pb-2 max-md:pt-1 md:pb-4">
            <Link
              href={`/${locale}/inventory`}
              className="inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-xl px-1 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span>กลับไปคลังสินค้า</span>
            </Link>
          </header>
        )}

        {addFromCatalogBar}
        <div className={BRANCH_WITHDRAW_SCROLL_BODY_CLASS}>
          {scrollableSections}
        </div>
      </div>

      <dialog ref={previewDialogRef} className={BRANCH_WITHDRAW_DIALOG_PREVIEW_CLASS}>
        <div className="flex w-fit max-w-[92vw] flex-col p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={DIALOG_TITLE_CLASS}>สรุปรายการ (อัปเดตตามที่กรอก)</h3>
              <p className={DIALOG_SUBTITLE_CLASS}>
                แสดงเฉพาะรายการที่มีจำนวนสาขา 1 ข้อความนี้จะเหมือนตอนกดบันทึก
              </p>
            </div>
            <button
              type="button"
              onClick={() => closeDialog(previewDialogRef.current)}
              className={DIALOG_CLOSE_BUTTON_CLASS}
              aria-label="ปิด"
            >
              <CloseIcon size="md" />
            </button>
          </div>
          <div className="mt-3 max-h-[min(60dvh,32rem)] overflow-y-auto overscroll-contain bb-smooth-scroll rounded-xl border border-border bg-background p-3">
            <pre className="w-max max-w-[calc(92vw-2.5rem)] whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
              {previewLineMessage}
            </pre>
          </div>
          {previewLineCount === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              กรอกจำนวนสาขา 1 อย่างน้อย 1 รายการเพื่อดูสรุป
            </p>
          ) : null}
          {previewCopyStatus ? (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {previewCopyStatus}
            </p>
          ) : null}
          <div className={DIALOG_FOOTER_CLASS}>
            <button
              type="button"
              onClick={() => void handleCopyPreview()}
              disabled={previewLineCount === 0}
              className={COPY_ICON_BUTTON_CLASS}
              aria-label="คัดลอก"
              title="คัดลอก"
            >
              <Copy className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => closeDialog(previewDialogRef.current)}
              className={DIALOG_SECONDARY_BUTTON_CLASS}
            >
              ปิด
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={addItemDialogRef}
        className={BRANCH_WITHDRAW_DIALOG_NARROW_CLASS}
        onClick={handleAddItemDialogClick}
        onCancel={(event) => {
          event.preventDefault();
          closeAddItemDialog();
        }}
      >
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className={DIALOG_TITLE_CLASS}>เพิ่มรายการจากคลังสินค้า</h3>
            <button
              type="button"
              onClick={closeAddItemDialog}
              className={DIALOG_CLOSE_BUTTON_CLASS}
              aria-label="ปิด"
            >
              <CloseIcon size="md" />
            </button>
          </div>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              id="branch-withdraw-add-item-search"
              name="branch-withdraw-add-item-search"
              value={addItemQuery}
              onChange={(event) => setAddItemQuery(event.target.value)}
              placeholder="ค้นหาชื่อสินค้า…"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'h-11 w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm',
                INPUT_FOCUS_CLASS,
              )}
              autoFocus
            />
          </label>
          <div className="mt-3 max-h-[min(50dvh,24rem)] space-y-1 overflow-y-auto overscroll-contain bb-smooth-scroll rounded-xl border border-border bg-background p-2">
            {filteredPickItems.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                {availablePickItems.length === 0
                  ? 'เพิ่มรายการจากคลังครบแล้ว'
                  : 'ไม่พบสินค้าที่ค้นหา'}
              </p>
            ) : (
              filteredPickItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddItem(item.id)}
                  className="flex w-full min-h-[44px] touch-manipulation items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15"
                >
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.unit || '-'}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </dialog>

      <dialog ref={saveResultDialogRef} className={BRANCH_WITHDRAW_DIALOG_WIDE_CLASS}>
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={DIALOG_TITLE_CLASS}>รับเข้าคลังสำเร็จ</h3>
              <p className={DIALOG_SUBTITLE_CLASS}>ข้อความ LINE สำหรับส่ง</p>
            </div>
            <button
              type="button"
              onClick={() => closeDialog(saveResultDialogRef.current)}
              className={DIALOG_CLOSE_BUTTON_CLASS}
              aria-label="ปิด"
            >
              <CloseIcon size="md" />
            </button>
          </div>
          <textarea
            readOnly
            name="branch-withdraw-save-line-message"
            value={saveLineMessage}
            className={cn(
              'mt-3 min-h-56 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground',
              INPUT_FOCUS_CLASS,
            )}
          />
          {copyStatus ? (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {copyStatus}
            </p>
          ) : null}
          <div className={DIALOG_FOOTER_CLASS}>
            <button
              type="button"
              onClick={() => void handleCopyLineMessage()}
              disabled={!saveLineMessage}
              className={COPY_ICON_BUTTON_CLASS}
              aria-label="คัดลอก"
              title="คัดลอก"
            >
              <Copy className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => closeDialog(saveResultDialogRef.current)}
              className={DIALOG_SECONDARY_BUTTON_CLASS}
            >
              ปิด
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={historyLineDialogRef}
        className={BRANCH_WITHDRAW_DIALOG_HISTORY_CLASS}
        onClick={handleHistoryLineDialogClick}
        onCancel={(event) => {
          event.preventDefault();
          closeHistoryLineDialog();
        }}
      >
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className={DIALOG_TITLE_CLASS}>{lineMessageDialog?.title ?? 'สรุปรายการ'}</h3>
            <button
              type="button"
              onClick={closeHistoryLineDialog}
              className={DIALOG_CLOSE_BUTTON_CLASS}
              aria-label="ปิด"
            >
              <CloseIcon size="md" />
            </button>
          </div>
          <textarea
            readOnly
            name="branch-withdraw-history-line-message"
            value={lineMessageDialog?.message ?? ''}
            className={cn(
              'mt-3 min-h-56 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground md:min-h-48',
              INPUT_FOCUS_CLASS,
            )}
          />
          {historyCopyStatus ? (
            <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
              {historyCopyStatus}
            </p>
          ) : null}
          <div className={DIALOG_FOOTER_CLASS}>
            <button
              type="button"
              onClick={() => void handleCopyHistoryLine()}
              disabled={!lineMessageDialog?.message}
              className={COPY_ICON_BUTTON_CLASS}
              aria-label="คัดลอก"
              title="คัดลอก"
            >
              <Copy className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
