'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { slideInLeft, staggerListItem, staggerDelay, BUTTON_HOVER, BUTTON_TAP } from '@/lib/motion-presets';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { saveServiceRecord, deleteServiceRecord } from '@/app/actions/maintenance-actions';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';
import {
  Plus,
  Wrench,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import React from 'react';
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
  cost: number;
  person_in_charge: string;
  status: 'กำลังดำเนินการ' | 'เสร็จสมบูรณ์';
  notes: string;
  completion_date?: string | null;
  created_at?: string;
}

interface MaintenanceClientProps {
  initialRecords: ServiceRecord[];
}

export default function MaintenanceClient({ initialRecords }: MaintenanceClientProps) {
  const isReadOnly = useReadOnly();
  const [records, setRecords] = useState<ServiceRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const { toast, setToast } = useToast();

  // Form State
  const [formData, setFormData] = useState<ServiceRecord>({
    start_date: '', // Hydration fix: Initialize empty, set in useEffect
    equipment: '',
    detected_problem: '',
    task_type: 'ซ่อมแซม',
    work_details: '',
    recommended_frequency: '',
    cost: 0,
    person_in_charge: '',
    status: 'กำลังดำเนินการ',
    notes: ''
  });

  const [isMounted, setIsMounted] = useState(false);
  const [isSubmitPending, startSubmitTransition] = useTransition();

  const DEFAULT_WIDTHS = {
    date: 120,
    equipment: 185,
    issue: 280,
    frequency: 140,
    technician: 160,
    taskType: 120,
    cost: 100,
    status: 110,
    manage: 110
  };

  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);
  const abortControllerRef = React.useRef<AbortController | null>(null);

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
          setColWidths(safeWidths);
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
        .select('id, start_date, equipment, detected_problem, task_type, work_details, recommended_frequency, cost, person_in_charge, status, notes, completion_date, created_at')
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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setToast({ message: READ_ONLY_DENY_MSG, type: 'error' });
      return;
    }

    const payload = {
      start_date: formData.start_date,
      equipment: formData.equipment,
      detected_problem: formData.detected_problem.trim() === "" ? null : formData.detected_problem,
      task_type: formData.task_type,
      work_details: formData.work_details.trim() === "" ? null : formData.work_details,
      recommended_frequency: formData.recommended_frequency.trim() === "" ? null : formData.recommended_frequency,
      cost: formData.cost || 0,
      person_in_charge: formData.person_in_charge.trim() === "" ? null : formData.person_in_charge,
      status: formData.status,
      notes: formData.notes.trim() === "" ? null : formData.notes,
      completion_date: formData.status === 'เสร็จสมบูรณ์' ? format(new Date(), 'yyyy-MM-dd') : null
    };

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
      cost: 0,
      person_in_charge: '',
      status: 'กำลังดำเนินการ',
      notes: ''
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
      recommended_frequency: record.recommended_frequency || '',
      cost: record.cost,
      person_in_charge: record.person_in_charge || '',
      status: record.status,
      notes: record.notes || ''
    });
    setIsModalOpen(true);
  }

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-10 text-foreground relative font-normal" style={{ lineHeight: '1.6' }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="space-y-1.5">
            <motion.h1
              initial={slideInLeft.initial}
              animate={slideInLeft.animate}
              transition={slideInLeft.transition}
              className="text-4xl md:text-5xl font-normal tracking-[0.1em] text-foreground flex items-center gap-3"
            >
              <div className="p-2.5 bg-black text-white rounded-2xl">
                <Wrench className="w-8 h-8" strokeWidth={1.5} />
              </div>
              ประวัติการซ่อมบำรุง
            </motion.h1>
            <p className="text-foreground/50 text-[13px] font-normal uppercase tracking-[0.3em] px-1">บันทึกการดูแลรักษาอุปกรณ์และเครื่องใช้</p>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={isReadOnly ? undefined : BUTTON_HOVER}
              whileTap={isReadOnly ? undefined : BUTTON_TAP}
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              disabled={isReadOnly}
              className="group flex items-center gap-2.5 bg-foreground hover:opacity-90 text-background px-7 py-3.5 rounded-3xl bb-transition bb-shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4.5 h-4.5" />
              <span className="font-normal text-sm tracking-wide">เพิ่มบันทึกใหม่</span>
            </motion.button>
          </div>
        </header>



        {/* Records List */}
        <main className="pb-20">
          {loading && records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-foreground/20">
              <Loader2 className="w-12 h-12 animate-spin mb-6" strokeWidth={1} />
              <span className="text-sm tracking-[0.3em] uppercase font-normal">Synchronizing Records...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-card/50 border border-dashed border-border rounded-3xl py-32 flex flex-col items-center justify-center text-muted-foreground">
              <Wrench className="w-20 h-20 mb-8 opacity-10" strokeWidth={0.5} />
              <p className="text-xl font-normal tracking-wide italic">No maintenance records discovered yet.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={isReadOnly}
                className="mt-8 text-foreground hover:opacity-60 transition-opacity font-normal text-xs uppercase tracking-[0.3em] border-b border-foreground pb-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Begin your first entry
              </button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y scrollbar-thin pb-6 box-border bg-card rounded-3xl border border-border bb-shadow-sm">
              <table className="w-full text-left border-collapse border-spacing-0 table-fixed" style={{ minWidth: '1100px' }}>
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th 
                      style={{ width: `${colWidths.date}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      วันที่
                      <div
                        onMouseDown={(e) => handleMouseDown('date', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.equipment}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      อุปกรณ์
                      <div
                        onMouseDown={(e) => handleMouseDown('equipment', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.issue}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      อาการ/ปัญหา
                      <div
                        onMouseDown={(e) => handleMouseDown('issue', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.frequency}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      ความถี่ที่แนะนำ
                      <div
                        onMouseDown={(e) => handleMouseDown('frequency', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.technician}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      ผู้รับผิดชอบ
                      <div
                        onMouseDown={(e) => handleMouseDown('technician', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.taskType}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      ประเภท
                      <div
                        onMouseDown={(e) => handleMouseDown('taskType', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.cost}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      ค่าใช้จ่าย
                      <div
                        onMouseDown={(e) => handleMouseDown('cost', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.status}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      สถานะ
                      <div
                        onMouseDown={(e) => handleMouseDown('status', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.manage}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-muted-foreground uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      จัดการ
                      <div
                        onMouseDown={(e) => handleMouseDown('manage', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <AnimatePresence>
                    {records.map((record, index) => (
                      <motion.tr
                        key={record.id}
                        initial={staggerListItem.initial}
                        animate={staggerListItem.animate}
                        transition={{ ...staggerListItem.transition, delay: staggerDelay(index) }}
                        className="group hover:bg-muted/30 bb-transition"
                      >
                        <td className="py-4 px-5 text-sm font-normal text-muted-foreground antialiased tabular-nums">
                          {format(new Date(record.start_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-4 px-5 text-[15px] font-normal text-foreground antialiased whitespace-normal break-words">
                          {record.equipment}
                        </td>
                        <td className="py-4 px-5 text-[14px] font-normal text-foreground antialiased whitespace-normal break-words" title={record.detected_problem || '-'}>
                          {record.detected_problem || '-'}
                        </td>
                        <td className="py-4 px-5 text-[14px] font-normal text-foreground antialiased whitespace-normal break-words">
                          {record.recommended_frequency || '-'}
                        </td>
                        <td className="py-4 px-5 text-[14px] font-normal text-foreground antialiased whitespace-normal break-words">
                          {record.person_in_charge || '-'}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className="inline-block px-3 py-1 bg-muted rounded-full uppercase tracking-widest font-normal text-[11px] text-muted-foreground">
                            {record.task_type}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-[15px] font-normal text-foreground antialiased text-right tabular-nums">
                          ฿{(record.cost || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-5 text-sm font-normal antialiased text-center">
                          <span className={`inline-flex px-3 py-1.5 text-xs rounded-2xl items-center justify-center gap-1.5 transition-all bb-shadow-sm border ${record.status === 'เสร็จสมบูรณ์'
                            ? 'bb-pastel-surface bg-[#f0fdf4] text-[#000000] border-[#dcfce7]'
                            : 'bb-pastel-surface bg-[#f0f9ff] text-[#000000] border-[#e0f2fe]'
                            }`}>
                            {record.status === 'เสร็จสมบูรณ์' ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />}
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <HintTooltip tip="แก้ไขบันทึก">
                              <button
                                onClick={() => handleEdit(record)}
                                disabled={isReadOnly}
                                className="p-2 hover:bg-muted/30 text-muted-foreground hover:text-foreground rounded-xl transition-all active:scale-90 disabled:opacity-60 disabled:cursor-not-allowed"
                                aria-label="แก้ไขบันทึก"
                              >
                                <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                              </button>
                            </HintTooltip>
                            <HintTooltip tip="ลบบันทึก">
                              <button
                                onClick={() => { setRecordToDelete(record.id!); setIsDeleteConfirmOpen(true); }}
                                disabled={isReadOnly}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-xl transition-all active:scale-90 disabled:opacity-60 disabled:cursor-not-allowed"
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
