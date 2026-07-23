'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Copy, Eye, Loader2, Plus, Save, Search, X } from 'lucide-react';
import {
  fetchBranchWithdrawalHistory,
  saveBranchWithdrawal,
  type BranchWithdrawHistoryRow,
} from '@/app/actions/branch-withdraw-actions';
import {
  buildBranchWithdrawDraftLines,
  clearBranchWithdrawDraft,
  emptyDraftRow,
  mergeRowsWithDisplayItemIds,
  readBranchWithdrawDraft,
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

type Item = BranchWithdrawDisplayItem;
type Props = { initialItems: InventoryRealtimeItem[]; initialHistory: BranchWithdrawHistoryRow[]; locale: string };

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
const DESKTOP_GRID_COLS =
  'md:grid-cols-[minmax(0,1fr)_4.25rem_4.25rem_minmax(6.75rem,8.5rem)]';
const INPUT_LABEL_CLASS = 'text-center text-[10px] leading-tight text-foreground/70 md:text-xs';
const INPUT_FIELD_CLASS =
  'h-8 w-full min-w-0 rounded-xl border border-border bg-background px-1 text-center text-xs outline-none tabular-nums md:h-9 md:px-2 md:text-sm';
const UNIT_INPUT_FIELD_CLASS = `${INPUT_FIELD_CLASS} placeholder:text-[10px] placeholder:leading-tight md:placeholder:text-xs`;
const MOBILE_INPUT_GRID_CLASS = 'grid grid-cols-3 gap-1 md:contents';
const BRANCH_WITHDRAW_DIALOG_BASE_CLASS =
  'm-auto max-h-[min(85dvh,100%)] rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40';
const BRANCH_WITHDRAW_DIALOG_PREVIEW_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-fit max-w-[92vw]`;
const BRANCH_WITHDRAW_DIALOG_WIDE_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-[min(780px,92vw)]`;
const BRANCH_WITHDRAW_DIALOG_HISTORY_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-[92vw] md:w-[min(560px,92vw)]`;
const BRANCH_WITHDRAW_DIALOG_NARROW_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-[min(640px,92vw)]`;
const STICKY_ACTION_BUTTON_CLASS =
  'flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50';
const COPY_ICON_BUTTON_CLASS =
  'inline-flex items-center justify-center rounded-xl border border-border bg-background p-2 text-sm disabled:cursor-not-allowed disabled:opacity-50';

function WithdrawRowInputs({
  row,
  onQtyBranch1,
  onQtyBranch2,
  onBranch2Unit,
}: {
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
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className={`flex flex-col gap-3 md:grid md:items-end md:gap-x-2 ${DESKTOP_GRID_COLS}`}>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border bg-background px-2 py-0.5 text-xs">
              {String(item.sort_order ?? 0).padStart(2, '0')}
            </div>
            {item.isManual ? (
              <span className="inline-flex rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-foreground/70">
                เพิ่มจากคลัง
              </span>
            ) : null}
            {item.isManual ? (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-foreground/70 transition-colors hover:bg-card"
                aria-label={`ลบ ${item.name} ออกจากรายการ`}
              >
                <X className="h-3 w-3" />
                <span>ลบ</span>
              </button>
            ) : null}
          </div>
          <p className="text-base leading-snug">{item.name}</p>
          <p className="text-xs text-foreground/70">หน่วย (สาขา 1): {item.unit || '-'}</p>
          <p className="mt-1 text-xs text-foreground/70">
            {item.isManual ? (
              <>
                ไม่อยู่ในรายการสั่งซื้อสาขา 2
                <span className="mx-1.5 text-foreground/40">·</span>
              </>
            ) : (
              <>
                จำนวนสั่งซื้อ:{' '}
                <span className="tabular-nums text-foreground">
                  {formatInventoryNumericDisplay(item.computedOrderQty)}
                </span>
                <span className="mx-1.5 text-foreground/40">·</span>
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

export default function BranchWithdrawClient({ initialItems, initialHistory, locale }: Props) {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const { items: realtimeItems, hasLoaded, refresh } = useInventoryRealtime();

  const inventorySource = hasLoaded ? realtimeItems : initialItems;

  const [extraItemIds, setExtraItemIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const draft = readBranchWithdrawDraft(window.sessionStorage);
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
    const draft = readBranchWithdrawDraft(window.sessionStorage);
    return mergeRowsWithDisplayItemIds(itemIds, draft?.rows ?? {});
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [history, setHistory] = useState(initialHistory);

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

  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const serialized = serializeBranchWithdrawDraft({ rows, extraItemIds });
    if (draftPersistSignatureRef.current === serialized) return;
    draftPersistSignatureRef.current = serialized;
    writeBranchWithdrawDraft(window.sessionStorage, { rows, extraItemIds });
  }, [extraItemIds, rows]);

  useEffect(() => {
    const itemIds = displayItemIdKey ? displayItemIdKey.split('\0') : [];
    setRows((prev) => mergeRowsWithDisplayItemIds(itemIds, prev));
  }, [displayItemIdKey]);

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

  const handleSave = useCallback(async () => {
    if (isReadOnly) {
      setSaveError(READ_ONLY_DENY_MSG);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setCopyStatus(null);

    try {
      const lines = buildBranchWithdrawDraftLines(displayItems, rows);
      const savedLines = filterBranchWithdrawSaveLines(lines);

      const result = await saveBranchWithdrawal({
        lines,
        clientSessionId: getClientSessionId(),
      });
      if (!result.success) {
        setSaveError(result.error || 'บันทึกไม่สำเร็จ');
        return;
      }

      if (typeof window !== 'undefined') {
        clearBranchWithdrawDraft(window.sessionStorage);
        draftPersistSignatureRef.current = null;
      }
      setExtraItemIds([]);
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

      void (async () => {
        await refresh();
        const historyResult = await fetchBranchWithdrawalHistory(30);
        if (historyResult.success) {
          setHistory(historyResult.data);
        }
        router.refresh();
      })();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [inventorySource, isReadOnly, refresh, router, rows, displayItems]);

  const openAddItemDialog = useCallback(() => {
    setAddItemQuery('');
    openDialog(addItemDialogRef.current);
  }, []);

  const handleAddItem = useCallback((itemId: string) => {
    setExtraItemIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
    closeDialog(addItemDialogRef.current);
    setAddItemQuery('');
  }, []);

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
  }, [lineMessageDialog?.message]);

  const openPreviewDialog = useCallback(() => {
    setPreviewCopyStatus(null);
    openDialog(previewDialogRef.current);
  }, []);

  const openHistoryLineDialog = useCallback((entry: BranchWithdrawHistoryRow) => {
    setHistoryCopyStatus(null);
    setLineMessageDialog({ title: `สรุปรายการ (${formatHistoryDate(entry.created_at)})`, message: entry.line_message });
    openDialog(historyLineDialogRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <Link
            href={`/${locale}/inventory`}
            className="flex items-center gap-1.5 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>กลับไปคลังสินค้า</span>
          </Link>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <h1 className="text-xl font-normal md:text-2xl">เบิกของสาขา 2</h1>
          <p className="mt-1 text-sm text-foreground/70">
            แสดงรายการสั่งซื้อช่องทางสาขา 2 ที่ต้องเติมสต็อก — สามารถเพิ่มสินค้าจากคลังได้
          </p>
          <button
            type="button"
            onClick={openAddItemDialog}
            disabled={availablePickItems.length === 0}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มรายการจากคลังสินค้า</span>
          </button>
        </section>

        {saveError && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            {saveError}
          </div>
        )}

        <section className="space-y-2 pb-28">
          {displayItems.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/70">
              ไม่มีรายการสั่งซื้อจากสาขา 2 ที่ต้องเบิกในขณะนี้ — กดปุ่มด้านบนเพื่อเพิ่มสินค้าจากคลัง
            </div>
          ) : (
            <>
              <div
                className={`hidden gap-x-2 px-4 text-xs text-foreground/60 md:grid ${DESKTOP_GRID_COLS}`}
              >
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

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 md:p-6">
          <h2 className="text-lg font-normal">ประวัติการเบิก</h2>
          {history.length === 0 ? (
            <p className="text-sm text-foreground/70">ยังไม่มีประวัติการเบิกสาขา 2</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <article
                  key={entry.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm">{formatHistoryDate(entry.created_at)}</p>
                    <p className="text-xs text-foreground/70">จำนวนรายการ: {entry.line_count}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openHistoryLineDialog(entry)}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs transition-colors hover:bg-background"
                  >
                    สรุปรายการ
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="sticky bottom-0 z-20 mt-2 border-t border-border bg-background/95 py-4 backdrop-blur [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-row gap-2">
            <button
              type="button"
              onClick={openPreviewDialog}
              disabled={previewLineCount === 0}
              className={STICKY_ACTION_BUTTON_CLASS}
            >
              <Eye className="h-4 w-4 shrink-0" />
              <span className="truncate">สรุปรายการ</span>
              {previewLineCount > 0 ? (
                <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs tabular-nums">
                  {previewLineCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isReadOnly || isSaving || previewLineCount === 0}
              className={STICKY_ACTION_BUTTON_CLASS}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span className="truncate">กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 shrink-0" />
                  <span className="truncate">บันทึก</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <dialog ref={previewDialogRef} className={BRANCH_WITHDRAW_DIALOG_PREVIEW_CLASS}>
        <div className="flex w-fit max-w-[92vw] flex-col p-4 md:p-5">
          <h3 className="text-base">สรุปรายการ (อัปเดตตามที่กรอก)</h3>
          <p className="mt-1 text-xs text-foreground/70">
            แสดงเฉพาะรายการที่มีจำนวนสาขา 1 — ข้อความนี้จะเหมือนตอนกดบันทึก
          </p>
          <div className="mt-3 max-h-[min(60dvh,32rem)] overflow-y-auto bb-smooth-scroll rounded-xl border border-border bg-background p-3">
            <pre className="w-max max-w-[calc(92vw-2.5rem)] whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {previewLineMessage}
            </pre>
          </div>
          {previewLineCount === 0 ? (
            <p className="mt-2 text-xs text-foreground/70">กรอกจำนวนสาขา 1 อย่างน้อย 1 รายการเพื่อดูสรุป</p>
          ) : null}
          {previewCopyStatus ? (
            <p className="mt-2 text-xs text-foreground/70">{previewCopyStatus}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              ปิด
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={addItemDialogRef} className={BRANCH_WITHDRAW_DIALOG_NARROW_CLASS}>
        <div className="p-4 md:p-5">
          <h3 className="text-base">เพิ่มรายการจากคลังสินค้า</h3>
          <p className="mt-1 text-xs text-foreground/70">
            เลือกสินค้าที่ต้องการเบิกแต่ยังไม่อยู่ในรายการสั่งซื้อสาขา 2
          </p>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <input
              type="search"
              value={addItemQuery}
              onChange={(event) => setAddItemQuery(event.target.value)}
              placeholder="ค้นหาชื่อสินค้า"
              className="h-10 w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none"
              autoFocus
            />
          </label>
          <div className="mt-3 max-h-[min(50dvh,24rem)] space-y-1 overflow-y-auto bb-smooth-scroll rounded-xl border border-border bg-background p-2">
            {filteredPickItems.length === 0 ? (
              <p className="px-2 py-3 text-sm text-foreground/70">
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
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors hover:border-border hover:bg-card"
                >
                  <span className="min-w-0 truncate">{item.name}</span>
                  <span className="shrink-0 text-xs text-foreground/70">{item.unit || '-'}</span>
                </button>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => closeDialog(addItemDialogRef.current)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              ปิด
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={saveResultDialogRef} className={BRANCH_WITHDRAW_DIALOG_WIDE_CLASS}>
        <div className="p-4 md:p-5">
          <h3 className="text-base">ข้อความ LINE สำหรับส่ง</h3>
          <textarea
            readOnly
            value={saveLineMessage}
            className="mt-3 min-h-56 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none"
          />
          {copyStatus && <p className="mt-2 text-xs text-foreground/70">{copyStatus}</p>}
          <div className="mt-4 flex justify-end gap-2">
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
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              ปิด
            </button>
          </div>
        </div>
      </dialog>

      <dialog ref={historyLineDialogRef} className={BRANCH_WITHDRAW_DIALOG_HISTORY_CLASS}>
        <div className="p-4 md:p-5">
          <h3 className="text-base">{lineMessageDialog?.title ?? 'สรุปรายการ'}</h3>
          <textarea
            readOnly
            value={lineMessageDialog?.message ?? ''}
            className="mt-3 min-h-56 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none md:min-h-48"
          />
          {historyCopyStatus ? (
            <p className="mt-2 text-xs text-foreground/70">{historyCopyStatus}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
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
            <button
              type="button"
              onClick={() => closeDialog(historyLineDialogRef.current)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              ปิด
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
