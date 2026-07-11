'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Clipboard, Loader2, Save } from 'lucide-react';
import {
  fetchBranchWithdrawalDetail,
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
import { useInventoryRealtime } from '@/contexts/InventoryRealtimeContext';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';

type Item = { id: string; name: string; unit: string; sort_order: number };
type Props = { initialItems: Item[]; initialHistory: BranchWithdrawHistoryRow[]; locale: string };

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

export default function BranchWithdrawClient({ initialItems, initialHistory, locale }: Props) {
  const isReadOnly = useReadOnly();
  const { refresh } = useInventoryRealtime();

  const sortedItems = useMemo(
    () => [...initialItems].sort((a, b) => a.sort_order - b.sort_order),
    [initialItems],
  );

  const [rows, setRows] = useState<Record<string, BranchWithdrawDraftRow>>(() => {
    if (typeof window === 'undefined') {
      return normalizeRowsByItems(sortedItems);
    }
    const draft = readBranchWithdrawDraft(window.sessionStorage);
    return normalizeRowsByItems(sortedItems, draft?.rows);
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [saveLineMessage, setSaveLineMessage] = useState('');
  const [lineMessageDialog, setLineMessageDialog] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const [detailDialogTitle, setDetailDialogTitle] = useState('');
  const [detailDialogLoading, setDetailDialogLoading] = useState(false);
  const [detailDialogError, setDetailDialogError] = useState<string | null>(null);
  const [detailDialogLines, setDetailDialogLines] = useState<BranchWithdrawDetailLine[]>([]);

  const saveResultDialogRef = useRef<HTMLDialogElement | null>(null);
  const historyLineDialogRef = useRef<HTMLDialogElement | null>(null);
  const detailDialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    writeBranchWithdrawDraft(window.sessionStorage, { rows });
  }, [rows]);

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

      const result = await saveBranchWithdrawal({ lines });
      if (!result.success) {
        setSaveError(result.error || 'บันทึกไม่สำเร็จ');
        return;
      }

      if (typeof window !== 'undefined') {
        clearBranchWithdrawDraft(window.sessionStorage);
      }
      setRows(normalizeRowsByItems(sortedItems));
      await refresh();

      setSaveLineMessage(result.lineMessage);
      openDialog(saveResultDialogRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [isReadOnly, refresh, rows, sortedItems]);

  const handleCopyLineMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(saveLineMessage);
      setCopyStatus('คัดลอกแล้ว');
    } catch {
      setCopyStatus('คัดลอกไม่สำเร็จ');
    }
  }, [saveLineMessage]);

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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
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
          <h1 className="text-xl font-normal md:text-2xl">เบิกของจากสาขา 2</h1>
          <p className="mt-1 text-sm text-foreground/70">
            ระบุจำนวนเบิกของสาขา 1 และจำนวนเทียบจากสาขา 2 เพื่อสร้างข้อความส่ง LINE ได้ทันที
          </p>
        </section>

        {saveError && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
            {saveError}
          </div>
        )}

        <section className="space-y-3 pb-24">
          {sortedItems.map((item) => {
            const row = rows[item.id] ?? emptyDraftRow();
            return (
              <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <div className="mb-1 inline-flex rounded-md border border-border bg-background px-2 py-0.5 text-xs">
                      {item.sort_order.toString().padStart(2, '0')}
                    </div>
                    <p className="text-base">{item.name}</p>
                    <p className="text-xs text-foreground/70">หน่วย (สาขา 1): {item.unit || '-'}</p>
                  </div>

                  <label className="flex flex-col gap-1 text-xs md:col-span-2">
                    <span>จำนวนสาขา 1</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.qtyBranch1}
                      onChange={(event) =>
                        updateRow(item.id, { qtyBranch1: sanitizeQtyInput(event.target.value) })
                      }
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                      placeholder=""
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs md:col-span-2">
                    <span>จำนวนสาขา 2</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={row.qtyBranch2}
                      onChange={(event) =>
                        updateRow(item.id, { qtyBranch2: sanitizeQtyInput(event.target.value) })
                      }
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                      placeholder=""
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs md:col-span-4">
                    <span>หน่วยสาขา 2</span>
                    <input
                      type="text"
                      value={row.branch2Unit}
                      onChange={(event) => updateRow(item.id, { branch2Unit: event.target.value })}
                      className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none"
                      placeholder="เช่น ลัง, แพ็ก"
                    />
                  </label>
                </div>
              </article>
            );
          })}
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 md:p-6">
          <h2 className="text-lg font-normal">ประวัติการเบิก</h2>
          {initialHistory.length === 0 ? (
            <p className="text-sm text-foreground/70">ยังไม่มีประวัติการเบิกจากสาขา 2</p>
          ) : (
            <div className="space-y-2">
              {initialHistory.map((entry) => (
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

        <div className="sticky bottom-0 z-20 mt-2 border-t border-border bg-background/95 py-3 backdrop-blur">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isReadOnly || isSaving}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm disabled:cursor-not-allowed disabled:opacity-50"
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

      <dialog ref={saveResultDialogRef} className="w-[min(780px,92vw)] rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40">
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

      <dialog ref={historyLineDialogRef} className="w-[min(780px,92vw)] rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40">
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

      <dialog ref={detailDialogRef} className="w-[min(640px,92vw)] rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40">
        <div className="p-4 md:p-5">
          <h3 className="text-base">{detailDialogTitle || 'รายละเอียด'}</h3>
          <div className="mt-3 max-h-80 space-y-2 overflow-auto rounded-xl border border-border bg-background p-3">
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
