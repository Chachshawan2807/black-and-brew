'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Plus,
  Wrench,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
  Calendar,
  ClipboardList,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import Image from 'next/image';
import React from 'react';

// Simple Toast implementation
const useToast = () => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return { toast, setToast };
};

interface ServiceRecord {
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

export default function MaintenancePage() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const dateInputRef = React.useRef<HTMLInputElement>(null);
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

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[id] || DEFAULT_WIDTHS[id as keyof typeof DEFAULT_WIDTHS];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentWidth = Math.max(70, startWidth + (moveEvent.pageX - startX));
      setColWidths(prev => {
        const updated = { ...prev, [id]: currentWidth };
        localStorage.setItem('bb-maintenance-col-widths', JSON.stringify(updated));
        return updated;
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    setIsMounted(true);
    setFormData(prev => ({ ...prev, start_date: format(new Date(), 'yyyy-MM-dd') }));
    
    // Load column widths from localStorage safely
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bb-maintenance-col-widths');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // [SECURITY] Type validation: reject non-object or non-numeric values
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
          localStorage.removeItem('bb-maintenance-col-widths'); // ล้างข้อมูลเสียหายออก
        }
      }
    }
    
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_records')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        setToast({ message: `ดึงข้อมูลไม่สำเร็จ: ${error.message}`, type: 'error' });
      } else {
        setRecords(data || []);
      }
    } catch (err: any) {
      setToast({ message: `เครือข่ายขัดข้อง: ${err?.message || 'ไม่สามารถเชื่อมต่อได้'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Prepare payload with DB-compliant mapping and explicit sanitation
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
      // Logic Fix: Auto-set completion_date if status is 'เสร็จสมบูรณ์'
      completion_date: formData.status === 'เสร็จสมบูรณ์' ? format(new Date(), 'yyyy-MM-dd') : null
    };

    try {
      let error;
      if (editingRecord?.id) {
        const { error: updateError } = await supabase
          .from('service_records')
          .update(payload)
          .eq('id', editingRecord.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('service_records')
          .insert([payload]);
        error = insertError;
      }

      if (error) {
        setToast({ message: `บันทึกไม่สำเร็จ: ${error.message}`, type: 'error' });
      } else {
        setToast({ message: 'บันทึกข้อมูลสำเร็จ', type: 'success' });
        setIsModalOpen(false);
        resetForm();
        fetchRecords();
      }
    } catch (err: any) {
      setToast({ message: `ระบบขัดข้อง: ${err?.message || 'โปรดลองอีกครั้ง'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!recordToDelete) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('service_records')
        .delete()
        .eq('id', recordToDelete);

      if (error) {
        setToast({ message: `ลบไม่สำเร็จ: ${error.message}`, type: 'error' });
      } else {
        setToast({ message: 'ลบข้อมูลสำเร็จ', type: 'success' });
        fetchRecords();
        setIsDeleteConfirmOpen(false);
        setRecordToDelete(null);
      }
    } catch (err: any) {
      setToast({ message: `ระบบขัดข้อง: ${err?.message || 'โปรดลองอีกครั้ง'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

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
    <div className="min-h-screen bg-[#fdfcf0] p-4 md:p-10 text-[#000000] relative font-normal" style={{ lineHeight: '1.6' }}>
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/5">
          <div className="space-y-1.5">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl md:text-5xl font-normal tracking-[0.1em] text-[#000000] flex items-center gap-3"
            >
              <div className="p-2.5 bg-black text-white rounded-2xl">
                <Wrench className="w-8 h-8" strokeWidth={1.5} />
              </div>
              ประวัติการซ่อมบำรุง
            </motion.h1>
            <p className="text-[#000000]/50 text-[13px] font-normal uppercase tracking-[0.3em] px-1">บันทึกการดูแลรักษาอุปกรณ์และเครื่องใช้</p>
          </div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="group flex items-center gap-2.5 bg-[#000000] hover:bg-black/80 text-white px-7 py-3.5 rounded-2xl transition-all shadow-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              <span className="font-medium text-sm tracking-wide">เพิ่มบันทึกใหม่</span>
            </motion.button>
          </div>
        </header>



        {/* Records List */}
        <main className="pb-20">
          {loading && records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-[#000000]/20">
              <Loader2 className="w-12 h-12 animate-spin mb-6" strokeWidth={1} />
              <span className="text-sm tracking-[0.3em] uppercase font-normal">Synchronizing Records...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white/50 border border-dashed border-[#000000]/10 rounded-[32px] py-32 flex flex-col items-center justify-center text-[#000000]/40">
              <Wrench className="w-20 h-20 mb-8 opacity-10" strokeWidth={0.5} />
              <p className="text-xl font-normal tracking-wide italic">No maintenance records discovered yet.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-8 text-[#000000] hover:opacity-60 transition-opacity font-normal text-xs uppercase tracking-[0.3em] border-b border-[#000000] pb-1"
              >
                Begin your first entry
              </button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto box-border bg-white rounded-3xl border border-black/5 shadow-sm">
              <table className="w-full text-left border-collapse border-spacing-0 table-fixed" style={{ minWidth: '1100px' }}>
                <thead>
                  <tr className="border-b border-neutral-200/50 bg-slate-50/50">
                    <th 
                      style={{ width: `${colWidths.date}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      วันที่
                      <div
                        onMouseDown={(e) => handleMouseDown('date', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.equipment}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      อุปกรณ์
                      <div
                        onMouseDown={(e) => handleMouseDown('equipment', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.issue}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      อาการ/ปัญหา
                      <div
                        onMouseDown={(e) => handleMouseDown('issue', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.frequency}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      ความถี่ที่แนะนำ
                      <div
                        onMouseDown={(e) => handleMouseDown('frequency', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.technician}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      ผู้รับผิดชอบ
                      <div
                        onMouseDown={(e) => handleMouseDown('technician', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.taskType}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      ประเภท
                      <div
                        onMouseDown={(e) => handleMouseDown('taskType', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.cost}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      ค่าใช้จ่าย
                      <div
                        onMouseDown={(e) => handleMouseDown('cost', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.status}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      สถานะ
                      <div
                        onMouseDown={(e) => handleMouseDown('status', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                    <th 
                      style={{ width: `${colWidths.manage}px` }} 
                      className="py-4 px-5 text-[13px] font-normal text-black/40 uppercase tracking-wider antialiased text-center relative group select-none"
                    >
                      จัดการ
                      <div
                        onMouseDown={(e) => handleMouseDown('manage', e)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent group-hover:bg-neutral-300 transition-colors z-10"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03]">
                  <AnimatePresence>
                    {records.map((record, index) => (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-4 px-5 text-sm font-normal text-neutral-600 antialiased font-mono">
                          {format(new Date(record.start_date), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-4 px-5 text-[15px] font-normal text-neutral-900 antialiased whitespace-normal break-words">
                          {record.equipment}
                        </td>
                        <td className="py-4 px-5 text-[14px] font-normal text-neutral-800 antialiased whitespace-normal break-words" title={record.detected_problem || '-'}>
                          {record.detected_problem || '-'}
                        </td>
                        <td className="py-4 px-5 text-[14px] font-normal text-neutral-800 antialiased whitespace-normal break-words">
                          {record.recommended_frequency || '-'}
                        </td>
                        <td className="py-4 px-5 text-[14px] font-normal text-neutral-800 antialiased whitespace-normal break-words">
                          {record.person_in_charge || '-'}
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className="inline-block px-2.5 py-1 bg-black/5 rounded-lg uppercase tracking-widest font-normal text-[11px] text-black/60">
                            {record.task_type}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-[15px] font-normal text-neutral-900 antialiased text-right font-mono">
                          ฿{(record.cost || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-5 text-sm font-normal antialiased text-center">
                          <span className={`inline-flex px-3 py-1.5 text-xs rounded-2xl items-center justify-center gap-1.5 transition-all shadow-sm border ${record.status === 'เสร็จสมบูรณ์'
                            ? 'bg-[#f0fdf4] text-[#14532d] border-[#dcfce7]'
                            : 'bg-[#f0f9ff] text-[#0c4a6e] border-[#e0f2fe]'
                            }`}>
                            {record.status === 'เสร็จสมบูรณ์' ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />}
                            {record.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(record)}
                              className="p-2 hover:bg-black/5 text-black/40 hover:text-black rounded-xl transition-all active:scale-90"
                            >
                              <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => { setRecordToDelete(record.id!); setIsDeleteConfirmOpen(true); }}
                              className="p-2 hover:bg-red-50 text-black/40 hover:text-red-500 rounded-xl transition-all active:scale-90"
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                            </button>
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

      {/* Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/10 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden border border-black/5"
            >
              <div className="p-5 border-b border-black/5 flex items-center justify-between bg-[#fff7ed]/50">
                <div>
                  <h2 className="text-xl font-normal text-[#000000] tracking-tight uppercase">
                    {editingRecord ? 'แก้ไขบันทึก' : 'เพิ่มบันทึกใหม่'}
                  </h2>
                  <p className="text-[13px] text-black/60 mt-0.5 uppercase tracking-widest font-normal">รายละเอียดการซ่อมและสถานะอุปกรณ์</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-black/5 rounded-2xl transition-colors text-black/40"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar bg-white">
                {/* Row 1: Date & Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5 cursor-pointer" onClick={() => dateInputRef.current?.showPicker()}>
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">วันที่รับบริการ</label>
                    <div className="relative h-11 flex items-center bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 cursor-pointer hover:bg-black/[0.04] transition-all">
                      <span className="text-sm text-black font-medium flex-1">
                        {formData.start_date ? format(parseISO(formData.start_date), 'dd/MM/yyyy') : ''}
                      </span>
                      <input
                        ref={dateInputRef}
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        className="sr-only"
                      />
                      <Calendar className="w-4 h-4 text-black/30" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ประเภทงาน</label>
                    <div className="relative">
                      <select
                        value={formData.task_type}
                        onChange={e => setFormData({ ...formData, task_type: e.target.value })}
                        className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-sm font-medium focus:outline-none transition-all appearance-none cursor-pointer hover:bg-black/[0.04]"
                      >
                        <option value="ซ่อมแซม">ซ่อมแซม</option>
                        <option value="บำรุงรักษา">บำรุงรักษา</option>
                        <option value="ติดตั้ง">ติดตั้ง</option>
                        <option value="เปลี่ยนอะไหล่">เปลี่ยนอะไหล่</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                      <ChevronRight className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-black/30 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Row 2: Equipment & Frequency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ชื่ออุปกรณ์</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น เครื่องชงเอสเปรสโซ"
                      value={formData.equipment}
                      onChange={e => setFormData({ ...formData, equipment: e.target.value })}
                      className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-sm font-medium focus:outline-none transition-all hover:bg-black/[0.04]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ความถี่ที่แนะนำ</label>
                    <input
                      type="text"
                      placeholder="เช่น ทุก 3 เดือน"
                      value={formData.recommended_frequency}
                      onChange={e => setFormData({ ...formData, recommended_frequency: e.target.value })}
                      className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-sm font-medium focus:outline-none transition-all hover:bg-black/[0.04]"
                    />
                  </div>
                </div>

                {/* Row 3: Cost & In Charge (Moved Up) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ค่าใช้จ่าย (บาท)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 text-sm font-normal">฿</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.cost === 0 ? '' : formData.cost}
                        onChange={e => {
                          const val = e.target.value.replace(/^0+/, '');
                          setFormData({ ...formData, cost: val === '' ? 0 : Number(val) });
                        }}
                        className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl pl-8 pr-4 py-2 text-sm font-medium focus:outline-none transition-all hover:bg-black/[0.04]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ผู้รับผิดชอบ</label>
                    <input
                      type="text"
                      placeholder="ชื่อ"
                      value={formData.person_in_charge}
                      onChange={e => setFormData({ ...formData, person_in_charge: e.target.value })}
                      className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-sm font-medium focus:outline-none transition-all hover:bg-black/[0.04]"
                    />
                  </div>
                </div>

                {/* Textareas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">อาการที่พบ</label>
                    <textarea
                      placeholder="อธิบายปัญหา"
                      rows={2}
                      value={formData.detected_problem}
                      onChange={e => setFormData({ ...formData, detected_problem: e.target.value })}
                      className="w-full bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2.5 text-sm font-medium focus:outline-none transition-all resize-none hover:bg-black/[0.04]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">รายละเอียดการซ่อม</label>
                    <textarea
                      placeholder="ดำเนินการอะไรบ้าง?"
                      rows={2}
                      value={formData.work_details}
                      onChange={e => setFormData({ ...formData, work_details: e.target.value })}
                      className="w-full bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2.5 text-sm font-medium focus:outline-none transition-all resize-none hover:bg-black/[0.04]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                  <div className="space-y-2">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">สถานะงาน</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'กำลังดำเนินการ' })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-normal transition-all ${formData.status === 'กำลังดำเนินการ' ? 'bg-[#f0f9ff] text-[#0284c7] border border-[#e0f2fe] shadow-sm' : 'bg-black/[0.02] text-black/30 hover:bg-black/[0.05]'}`}
                      >
                        <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                        กำลังดำเนินการ
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'เสร็จสมบูรณ์' })}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-normal transition-all ${formData.status === 'เสร็จสมบูรณ์' ? 'bg-[#f0fdf4] text-[#10b981] border border-[#dcfce7] shadow-sm' : 'bg-black/[0.02] text-black/30 hover:bg-black/[0.05]'}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        เสร็จสิ้น
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">หมายเหตุ</label>
                    <input
                      type="text"
                      placeholder="หมายเหตุ"
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-sm font-medium focus:outline-none transition-all hover:bg-black/[0.04]"
                    />
                  </div>
                </div>
              </form>

              <div className="p-5 bg-gray-50/50 border-t border-black/5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-black/60 font-normal hover:text-black transition-all text-[12px] uppercase tracking-widest"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-[2] py-3 bg-black text-white font-normal rounded-2xl hover:bg-black/80 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-[12px] uppercase tracking-widest"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" strokeWidth={2} />}
                  ยืนยันบันทึก
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-md" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden border-none animate-in fade-in zoom-in duration-500 p-10 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-10 h-10" strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-normal text-[#000000] tracking-tighter mb-2 uppercase">Delete Record?</h3>
            <p className="text-[#000000]/40 text-sm font-normal mb-8 leading-relaxed">This action is irreversible and will permanently remove this maintenance entry from the vault.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="w-full py-4 bg-red-500 text-white font-normal rounded-3xl hover:bg-red-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-widest"
              >
                {loading ? 'Processing...' : 'Confirm Deletion'}
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="w-full py-4 text-[#000000]/40 font-normal hover:text-[#000000] transition-all text-sm uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-3xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-full duration-300 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-normal">{toast.message}</span>
        </div>
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
