'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Clipboard, Eye, Loader2, Save } from 'lucide-react';
import {
  fetchBranchWithdrawalDetail,
  fetchBranchWithdrawalHistory,
  saveBranchWithdrawal,
  type BranchWithdrawHistoryRow,
  type BranchWithdrawDetailLine,
} from '@/app/actions/branch-withdraw-actions';
import {
  clearBranchWithdrawDraft,
  emptyDraftRow,
  readBranchWithdrawDraft,
  writeBranchWithdrawDraft,
  type BranchWithdrawDraftRow,
} from '@/lib/inventory-branch-withdraw-draft';
import { useInventoryRealtime, type InventoryRealtimeItem } from '@/contexts/InventoryRealtimeContext';
import {
  computeBranchWithdrawItems,
  formatInventoryNumericDisplay,
  type InventoryStockFields,
} from '@/lib/inventory-stock';
import {
  filterBranchWithdrawSaveLines,
  formatBranchWithdrawLineMessage,
} from '@/lib/inventory-branch-withdraw-format';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';
import { getClientSessionId } from '@/lib/client-session';

type Item = InventoryStockFields & {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
  computedOrderQty: number;
};
type Props = { initialItems: InventoryRealtimeItem[]; initialHistory: BranchWithdrawHistoryRow[]; locale: string };

function sanitizeQtyInput(raw: string): string {
  const digitsOnly = raw.replace(/[^0-9]/g, '');
  if (digitsOnly === '') return '';
  return digitsOnly.replace(/^0+(?=\d)/, '');
}

function normalizeRowsByItems(
  items: Item[],
  source?: Record<string, BranchWithdrawDraftRow>,
): Record<string, BranchWithdrawDraftRow> {
  const rows: Record<string, BranchWithdrawDraftRow> = {};
  for (const item of items) {
    rows[item.id] = source?.[item.id] ?? emptyDraftRow();
  }
  return rows;
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
const BRANCH_WITHDRAW_DIALOG_NARROW_CLASS = `${BRANCH_WITHDRAW_DIALOG_BASE_CLASS} w-[min(640px,92vw)]`;
const STICKY_ACTION_BUTTON_CLASS =
  'flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50';

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

export default function BranchWithdrawClient({ initialItems, initialHistory, locale }: Props) {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const { items: realtimeItems, hasLoaded, refresh } = useInventoryRealtime();

  const inventorySource = hasLoaded ? realtimeItems : initialItems;

  const sortedItems = useMemo(() => {
    const branchItems = computeBranchWithdrawItems(inventorySource);
    return [...branchItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [inventorySource]);

  const [rows, setRows] = useState<Record<string, BranchWithdrawDraftRow>>(() => {
    if (typeof window === 'undefined') {
      return normalizeRowsByItems(sortedItems);
    }
    const draft = readBranchWithdrawDraft(window.sessionStorage);
    return normalizeRowsByItems(sortedItems, draft?.rows);
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

  const [detailDialogTitle, setDetailDialogTitle] = useState('');
  const [detailDialogLoading, setDetailDialogLoading] = useState(false);
  const [detailDialogError, setDetailDialogError] = useState<string | null>(null);
  const [detailDialogLines, setDetailDialogLines] = useState<BranchWithdrawDetailLine[]>([]);

  const saveResultDialogRef = useRef<HTMLDialogElement | null>(null);
  const previewDialogRef = useRef<HTMLDialogElement | null>(null);
  const historyLineDialogRef = useRef<HTMLDialogElement | null>(null);
  const detailDialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    setHistory(initialHistory);
  }, [initialHistory]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    writeBranchWithdrawDraft(window.sessionStorage, { rows });
  }, [rows]);

  useEffect(() => {
    setRows((prev) => normalizeRowsByItems(sortedItems, prev));
  }, [sortedItems]);

  const previewLineMessage = useMemo(() => {
    const payload = sortedItems.map((item) => {
      const draft = rows[item.id] ?? emptyDraftRow();
      return {
        itemId: item.id,
        name: item.name,
        qtyBranch1: draft.qtyBranch1,
        qtyBranch2: draft.qtyBranch2,
        branch2Unit: draft.branch2Unit,
      };
    });
    const filtered = filterBranchWithdrawSaveLines(payload);
    return formatBranchWithdrawLineMessage(filtered);
  }, [rows, sortedItems]);

  const previewLineCount = useMemo(() => {
    return filterBranchWithdrawSaveLines(
      sortedItems.map((item) => {
        const draft = rows[item.id] ?? emptyDraftRow();
        return {
          itemId: item.id,
          name: item.name,
          qtyBranch1: draft.qtyBranch1,
          qtyBranch2: draft.qtyBranch2,
          branch2Unit: draft.branch2Unit,
        };
      }),
    ).length;
  }, [rows, sortedItems]);

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
      const lines = sortedItems.map((item) => {
        const draft = rows[item.id] ?? emptyDraftRow();
        return {
          itemId: item.id,
          name: item.name,
          qtyBranch1: draft.qtyBranch1,
          qtyBranch2: draft.qtyBranch2,
          branch2Unit: draft.branch2Unit,
        };
      });

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
      }
      setRows(normalizeRowsByItems(sortedItems));

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
  }, [isReadOnly, refresh, router, rows, sortedItems]);

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

  const openPreviewDialog = useCallback(() => {
    setPreviewCopyStatus(null);
    openDialog(previewDialogRef.current);
  }, []);

  const openHistoryLineDialog = useCallback((entry: BranchWithdrawHistoryRow) => {
    setLineMessageDialog({ title: `ข้อความ LINE (${formatHistoryDate(entry.created_at)})`, message: entry.line_message });
    openDialog(historyLineDialogRef.current);
  }, []);

  const openDetailDialog = useCallback(async (entry: BranchWithdrawHistoryRow) => {
    setDetailDialogTitle(`รายละเอียดรายการ (${formatHistoryDate(entry.created_at)})`);
    setDetailDialogLoading(true);
    setDetailDialogError(null);
    setDetailDialogLines([]);
    openDialog(detailDialogRef.current);

    const result = await fetchBranchWithdrawalDetail(entry.id);
    if (!result.success) {
      setDetailDialogError(result.error || 'ไม่สามารถโหลดรายละเอียดได้');
      setDetailDialogLoading(false);
      return;
    }

    setDetailDialogLines(result.data ?? []);
    setDetailDialogLoading(false);
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
            แสดงเฉพาะรายการสั่งซื้อช่องทางสาขา 2 ที่ต้องเติมสต็อก — ระบุจำนวนเบิกแล้วกดบันทึกเพื่อส่ง LINE
          </p>
        </section>

        {saveError && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            {saveError}
          </div>
        )}

        <section className="space-y-2 pb-28">
          {sortedItems.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-foreground/70">
              ไม่มีรายการสั่งซื้อจากสาขา 2 ที่ต้องเบิกในขณะนี้
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
              {sortedItems.map((item) => {
                const row = rows[item.id] ?? emptyDraftRow();
                return (
                  <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className={`flex flex-col gap-3 md:grid md:items-end md:gap-x-2 ${DESKTOP_GRID_COLS}`}>
                      <div className="min-w-0">
                        <div className="mb-1 inline-flex rounded-md border border-border bg-background px-2 py-0.5 text-xs">
                          {String(item.sort_order ?? 0).padStart(2, '0')}
                        </div>
                        <p className="text-base leading-snug">{item.name}</p>
                        <p className="text-xs text-foreground/70">หน่วย (สาขา 1): {item.unit || '-'}</p>
                        <p className="mt-1 text-xs text-foreground/70">
                          จำนวนสั่งซื้อ:{' '}
                          <span className="tabular-nums text-foreground">
                            {formatInventoryNumericDisplay(item.computedOrderQty)}
                          </span>
                          <span className="mx-1.5 text-foreground/40">·</span>
                          คงเหลือในสต็อก:{' '}
                          <span className="tabular-nums text-foreground">
                            {formatInventoryNumericDisplay(item.stock)}
                          </span>
                        </p>
                      </div>

                      <div className={MOBILE_INPUT_GRID_CLASS}>
                        <WithdrawRowInputs
                          row={row}
                          onQtyBranch1={(value) => updateRow(item.id, { qtyBranch1: value })}
                          onQtyBranch2={(value) => updateRow(item.id, { qtyBranch2: value })}
                          onBranch2Unit={(value) => updateRow(item.id, { branch2Unit: value })}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
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
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openHistoryLineDialog(entry)}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs transition-colors hover:bg-background"
                    >
                      ดูข้อความ LINE
                    </button>
                    <button
                      type="button"
                      onClick={() => void openDetailDialog(entry)}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs transition-colors hover:bg-background"
                    >
                      รายละเอียด
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="sticky bottom-0 z-20 mt-2 border-t border-border bg-background/95 py-4 backdrop-blur [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openPreviewDialog}
              disabled={sortedItems.length === 0}
              className={STICKY_ACTION_BUTTON_CLASS}
            >
              <Eye className="h-4 w-4" />
              <span>ดูตัวอย่างข้อความ LINE</span>
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>บันทึก</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <dialog ref={previewDialogRef} className={BRANCH_WITHDRAW_DIALOG_PREVIEW_CLASS}>
        <div className="flex w-fit max-w-[92vw] flex-col p-4 md:p-5">
          <h3 className="text-base">ตัวอย่างข้อความ LINE (อัปเดตตามที่กรอก)</h3>
          <p className="mt-1 text-xs text-foreground/70">
            แสดงเฉพาะรายการที่มีจำนวนสาขา 1 — ข้อความนี้จะเหมือนตอนกดบันทึก
          </p>
          <div className="mt-3 max-h-[min(60dvh,32rem)] overflow-y-auto bb-smooth-scroll rounded-xl border border-border bg-background p-3">
            <pre className="w-max max-w-[calc(92vw-2.5rem)] whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {previewLineMessage}
            </pre>
          </div>
          {previewLineCount === 0 ? (
            <p className="mt-2 text-xs text-foreground/70">กรอกจำนวนสาขา 1 อย่างน้อย 1 รายการเพื่อดูตัวอย่าง</p>
          ) : null}
          {previewCopyStatus ? (
            <p className="mt-2 text-xs text-foreground/70">{previewCopyStatus}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => void handleCopyPreview()}
              disabled={previewLineCount === 0}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <Clipboard className="h-4 w-4" />
              <span>คัดลอก</span>
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
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <Clipboard className="h-4 w-4" />
              <span>คัดลอก</span>
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

      <dialog ref={historyLineDialogRef} className={BRANCH_WITHDRAW_DIALOG_WIDE_CLASS}>
        <div className="p-4 md:p-5">
          <h3 className="text-base">{lineMessageDialog?.title ?? 'ข้อความ LINE'}</h3>
          <textarea
            readOnly
            value={lineMessageDialog?.message ?? ''}
            className="mt-3 min-h-56 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none"
          />
          <div className="mt-4 flex justify-end">
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

      <dialog ref={detailDialogRef} className={BRANCH_WITHDRAW_DIALOG_NARROW_CLASS}>
        <div className="p-4 md:p-5">
          <h3 className="text-base">{detailDialogTitle || 'รายละเอียด'}</h3>
          <div className="mt-3 max-h-80 space-y-2 overflow-auto bb-smooth-scroll rounded-xl border border-border bg-background p-3">
            {detailDialogLoading && (
              <p className="flex items-center gap-2 text-sm text-foreground/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>กำลังโหลดข้อมูล...</span>
              </p>
            )}
            {!detailDialogLoading && detailDialogError && (
              <p className="text-sm">{detailDialogError}</p>
            )}
            {!detailDialogLoading && !detailDialogError && detailDialogLines.length === 0 && (
              <p className="text-sm text-foreground/70">ไม่พบรายการรายละเอียด</p>
            )}
            {!detailDialogLoading &&
              !detailDialogError &&
              detailDialogLines.map((line, index) => (
                <div key={`${line.itemName}-${line.created_at}-${index}`} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <p>{line.itemName}</p>
                  <p className="text-xs text-foreground/70">จำนวน: {line.quantity}</p>
                </div>
              ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => closeDialog(detailDialogRef.current)}
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
