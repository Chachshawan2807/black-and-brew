'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import { useState, useEffect, useTransition, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerListItem, staggerDelay, BUTTON_HOVER, BUTTON_TAP } from '@/lib/motion-presets';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { saveServiceRecord, deleteServiceRecord } from '@/app/actions/maintenance-actions';
import {
  buildServiceRecordPayload,
  parseFrequencyMonthsForDisplay,
  type ServiceRecordFormInput,
} from '@/lib/maintenance/service-record-form';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';
import {
  Plus,
  Wrench,
  Pencil,
  Trash2,
} from '@/lib/icons';
import { format } from 'date-fns';
import { SECRETARY_TASK_COLORS } from '@/lib/shift-colors';
import { cn } from '@/lib/utils';
import { FloatingToast } from '@/components/ui/floating-alert';
import { HintTooltip } from '@/components/ui/hint-tooltip';

const MaintenanceModals = dynamic(() => import('./_components/MaintenanceModals'), { ssr: false });

// Simple Toast implementation
const useToast = () => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  return { toast, setToast };
};

export interface ServiceRecord {
  id?: string;
  start_date: string;
  equipment: string;
  detected_problem: string;
  task_type: string;
  work_details: string;
  recommended_frequency: string;
  completion_date?: string | null;
  created_at?: string;
}

interface MaintenanceClientProps {
  initialRecords: ServiceRecord[];
  embedded?: boolean;
  highlightRecordIds?: string[];
}

export default function MaintenanceClient({
  initialRecords,
  embedded = false,
  highlightRecordIds,
}: MaintenanceClientProps) {
  const isReadOnly = useReadOnly();
  const [records, setRecords] = useState<ServiceRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const { toast, setToast } = useToast();

  // Form State
  const [formData, setFormData] = useState<ServiceRecordFormInput>({
    start_date: '', // Hydration fix: Initialize empty, set in useEffect
    equipment: '',
    detected_problem: '',
    task_type: 'ซ่อมแซม',
    work_details: '',
    recommended_frequency: '',
  });

  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitPending, startSubmitTransition] = useTransition();

  const DEFAULT_WIDTHS = {
    date: 120,
    equipment: 185,
    issue: 100,
    frequency: 140,
    taskType: 120,
    manage: 88,
  };

  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[id] || DEFAULT_WIDTHS[id as keyof typeof DEFAULT_WIDTHS];

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentWidth = Math.max(70, startWidth + (moveEvent.pageX - startX));
      setColWidths(prev => {
        const updated = { ...prev, [id]: currentWidth };
        localStorage.setItem('bb-maintenance-col-widths', JSON.stringify(updated));
        return updated;
      });
    };

    const handleMouseUp = () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove, { signal });
    window.addEventListener('mouseup', handleMouseUp, { signal });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only mount gate before localStorage/date hydration
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate form date and column widths from client storage on mount
    setFormData(prev => ({ ...prev, start_date: format(new Date(), 'yyyy-MM-dd') }));

    const saved = localStorage.getItem('bb-maintenance-col-widths');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const safeWidths: Record<string, number> = {};
          Object.entries(parsed).forEach(([key, val]) => {
            if (typeof key === 'string' && typeof val === 'number' && val > 0 && val < 2000) {
              safeWidths[key] = val;
            }
          });
          const merged = { ...DEFAULT_WIDTHS, ...safeWidths };
          if (safeWidths.issue === undefined || safeWidths.issue === 280 || safeWidths.issue === 140) {
            merged.issue = DEFAULT_WIDTHS.issue;
          }
          if (safeWidths.manage === undefined || safeWidths.manage === 110) {
            merged.manage = DEFAULT_WIDTHS.manage;
          }
          setColWidths(merged);
          if (
            safeWidths.issue === undefined ||
            safeWidths.issue === 280 ||
            safeWidths.issue === 140 ||
            safeWidths.manage === undefined ||
            safeWidths.manage === 110
          ) {
            localStorage.setItem('bb-maintenance-col-widths', JSON.stringify(merged));
          }
        }
      } catch (e) {
        console.error(e);
        localStorage.removeItem('bb-maintenance-col-widths');
      }
    }
  }, [isMounted]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      await ensureSupabaseSession();
      const { data, error } = await supabase
        .from('service_records')
        .select('id, start_date, equipment, detected_problem, task_type, work_details, recommended_frequency, completion_date, created_at')
        .order('start_date', { ascending: false });

      if (error) {
        setToast({ message: `ดึงข้อมูลไม่สำเร็จ: ${error.message}`, type: 'error' });
      } else {
        setRecords(data || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถเชื่อมต่อได้';
      setToast({ message: `เครือข่ายขัดข้อง: ${message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setToast]);

  const equipmentSuggestions = useMemo(
    () => records.map(record => record.equipment),
    [records],
  );

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setToast({ message: READ_ONLY_DENY_MSG, type: 'error' });
      return;
    }

    const today = format(new Date(), 'yyyy-MM-dd');
    const payload = buildServiceRecordPayload(formData, today);

    startSubmitTransition(() => {
      void (async () => {
        setLoading(true);
        try {
          const result = await saveServiceRecord(payload, editingRecord?.id);

          if (!result.success) {
            setToast({ message: result.error || `บันทึกไม่สำเร็จค่ะ`, type: 'error' });
          } else {
            setToast({ message: 'บันทึกข้อมูลสำเร็จแล้วค่ะ', type: 'success' });
            
            // Optimistic update
            setRecords((prev) => {
              if (editingRecord?.id) {
                return prev.map((r) => r.id === editingRecord.id ? { ...r, ...payload, id: editingRecord.id } as ServiceRecord : r);
              }
              // For new records, prepend with a temporary ID until fetchRecords syncs it
              return [{ ...payload, id: `temp-${Date.now()}` } as ServiceRecord, ...prev];
            });

            setIsModalOpen(false);
            resetForm();
            
            // Background sync
            void fetchRecords();
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'โปรดลองอีกครั้ง';
          setToast({ message: `ระบบขัดข้อง: ${message}`, type: 'error' });
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [isReadOnly, formData, editingRecord?.id, setToast, fetchRecords]);

  const handleDelete = useCallback(() => {
    if (isReadOnly) {
      setToast({ message: READ_ONLY_DENY_MSG, type: 'error' });
      return;
    }
    if (!recordToDelete) return;

    startSubmitTransition(() => {
      void (async () => {
        setLoading(true);
        try {
          const result = await deleteServiceRecord(recordToDelete);

          if (!result.success) {
            setToast({ message: result.error || `ลบไม่สำเร็จค่ะ`, type: 'error' });
          } else {
            setToast({ message: 'ลบข้อมูลสำเร็จแล้วค่ะ', type: 'success' });
            
            // Optimistic delete
            setRecords((prev) => prev.filter((r) => r.id !== recordToDelete));
            
            setIsDeleteConfirmOpen(false);
            setRecordToDelete(null);
            
            // Background sync
            void fetchRecords();
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'โปรดลองอีกครั้ง';
          setToast({ message: `ระบบขัดข้อง: ${message}`, type: 'error' });
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [isReadOnly, recordToDelete, setToast, fetchRecords]);

  function resetForm() {
    setFormData({
      start_date: format(new Date(), 'yyyy-MM-dd'),
      equipment: '',
      detected_problem: '',
      task_type: 'ซ่อมแซม',
      work_details: '',
      recommended_frequency: '',
    });
    setEditingRecord(null);
  }

  function handleEdit(record: ServiceRecord) {
    setEditingRecord(record);
    setFormData({
      start_date: record.start_date,
      equipment: record.equipment,
      detected_problem: record.detected_problem || '',
      task_type: record.task_type,
      work_details: record.work_details || '',
      recommended_frequency: parseFrequencyMonthsForDisplay(record.recommended_frequency || ''),
    });
    setIsModalOpen(true);
  }

  const highlightIds = useMemo(
    () => new Set(highlightRecordIds ?? []),
    [highlightRecordIds],
  );

  if (!isMounted) return null;

  return (
    <div
      className={cn(
        'bg-transparent text-foreground relative font-normal',
        embedded ? 'min-h-0 p-0' : 'min-h-screen p-4 md:p-10',
      )}
      style={{ lineHeight: '1.6' }}
    >
      <div className={cn('mx-auto space-y-8', embedded ? 'max-w-none' : 'max-w-7xl')}>

        {/* Header */}
        <header className={cn(
          'flex items-center justify-end pb-4 border-b border-border',
          embedded && 'pb-3',
        )}>
          <motion.button
            whileHover={isReadOnly ? undefined : BUTTON_HOVER}
            whileTap={isReadOnly ? undefined : BUTTON_TAP}
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            disabled={isReadOnly}
            className="group flex items-center gap-2.5 border-2 border-foreground/85 bg-card text-foreground px-7 py-3.5 rounded-2xl bb-transition bb-shadow-sm hover:bg-muted/35 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="w-4.5 h-4.5" />
            <span className="font-normal text-sm tracking-wide">เพิ่มบันทึกใหม่</span>
          </motion.button>
        </header>



        {/* Records List */}
        <main className={embedded ? 'pb-2' : 'pb-20'}>
          {loading && records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-foreground/20">
              <LoadingIcon size="2xl" className="mb-6" />
              <span className="text-sm tracking-[0.3em] uppercase font-normal">กำลังโหลดบันทึก...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-card/50 border border-dashed border-border rounded-2xl py-32 flex flex-col items-center justify-center text-muted-foreground">
              <Wrench className="w-20 h-20 mb-8 opacity-10" strokeWidth={0.5} />
              <p className="text-xl font-normal tracking-wide italic">ยังไม่มีบันทึกการซ่อมบำรุง</p>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={isReadOnly}
                className="mt-8 text-foreground hover:opacity-60 transition-opacity font-normal text-xs uppercase tracking-[0.3em] border-b border-foreground pb-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                เริ่มบันทึกแรก
              </button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y scrollbar-thin pb-6 box-border bb-table-wrapper">
              <table className="w-full text-left border-collapse border-spacing-0 table-fixed" style={{ minWidth: '660px' }}>
                <thead>
                  <tr className="border-b border-border bg-card bb-shadow-sm">
                    <th 
                      style={{ width: `${colWidths.date}px` }} 
                      className="py-3.5 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none border-r border-border/50"
                    >
                      วันที่
                      <div
                        onMouseDown={(e) => handleMouseDown('date', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.equipment}px` }} 
                      className="py-3.5 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none border-r border-border/50"
                    >
                      อุปกรณ์
                      <div
                        onMouseDown={(e) => handleMouseDown('equipment', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.issue}px` }} 
                      className="py-3.5 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none border-r border-border/50"
                    >
                      อาการ/ปัญหา
                      <div
                        onMouseDown={(e) => handleMouseDown('issue', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.frequency}px` }} 
                      className="py-3.5 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none border-r border-border/50"
                    >
                      ดำเนินการทุก (เดือน)
                      <div
                        onMouseDown={(e) => handleMouseDown('frequency', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.taskType}px` }} 
                      className="py-3.5 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none border-r border-border/50"
                    >
                      ประเภท
                      <div
                        onMouseDown={(e) => handleMouseDown('taskType', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.manage}px` }} 
                      className="py-3.5 px-2 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      จัดการ
                      <div
                        onMouseDown={(e) => handleMouseDown('manage', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {records.map((record, index) => (
                      <motion.tr
                        key={record.id}
                        initial={staggerListItem.initial}
                        animate={staggerListItem.animate}
                        transition={{ ...staggerListItem.transition, delay: staggerDelay(index) }}
                        className={cn(
                          'group border-b border-border/60 odd:bg-muted/10 even:bg-card hover:bg-muted/25 bb-transition',
                          record.id && highlightIds.has(record.id) && SECRETARY_TASK_COLORS.attention,
                        )}
                      >
                        <td className="py-3.5 px-5 text-sm font-normal text-muted-foreground antialiased tabular-nums border-r border-border/40">
                          {format(new Date(record.start_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-3.5 px-5 text-[15px] font-normal text-foreground antialiased whitespace-normal break-words border-r border-border/40">
                          {record.equipment}
                        </td>
                        <td className="py-3.5 px-5 text-[14px] font-normal text-foreground antialiased whitespace-normal break-words border-r border-border/40" title={record.detected_problem || '-'}>
                          {record.detected_problem || '-'}
                        </td>
                        <td className="py-3.5 px-5 text-[14px] font-normal text-foreground antialiased whitespace-normal break-words border-r border-border/40">
                          {record.recommended_frequency || '-'}
                        </td>
                        <td className="py-3.5 px-5 text-center border-r border-border/40">
                          <span className="inline-block px-3 py-1 bg-muted rounded-full uppercase tracking-widest font-normal text-[11px] text-muted-foreground">
                            {record.task_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <HintTooltip tip="แก้ไขบันทึก">
                              <button
                                onClick={() => handleEdit(record)}
                                disabled={isReadOnly}
                                className="p-2 hover:bg-muted/30 text-muted-foreground hover:text-foreground rounded-xl bb-transition active:scale-90 disabled:opacity-60 disabled:cursor-not-allowed"
                                aria-label="แก้ไขบันทึก"
                              >
                                <Pencil className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                            </HintTooltip>
                            <HintTooltip tip="ลบบันทึก">
                              <button
                                onClick={() => { setRecordToDelete(record.id!); setIsDeleteConfirmOpen(true); }}
                                disabled={isReadOnly}
                                className="rounded-2xl border border-border/80 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 bb-transition active:scale-90 disabled:opacity-60 disabled:cursor-not-allowed"
                                aria-label="ลบบันทึก"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                            </HintTooltip>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <MaintenanceModals
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        isDeleteConfirmOpen={isDeleteConfirmOpen}
        setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
        editingRecord={editingRecord}
        formData={formData}
        setFormData={setFormData}
        equipmentSuggestions={equipmentSuggestions}
        handleSubmit={handleSubmit}
        handleDelete={handleDelete}
        loading={loading || isSubmitPending}
        isReadOnly={isReadOnly}
      />

      {/* Toast Notification */}
      {toast && (
        <FloatingToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
