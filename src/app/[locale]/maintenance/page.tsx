'use client';

import { useState, useEffect } from 'react';
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
  Calendar
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

  useEffect(() => {
    setIsMounted(true);
    setFormData(prev => ({ ...prev, start_date: format(new Date(), 'yyyy-MM-dd') }));
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
    <div className="min-h-screen bg-inherit p-4 md:p-6 text-[#333333] relative">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-normal tracking-tighter text-[#111111] uppercase flex items-center gap-3">
              <Wrench className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
              Maintenance Records
            </h1>
            <p className="text-gray-400 text-sm font-normal uppercase tracking-widest px-1">บันทึกประวัติการซ่อมบำรุงอุปกรณ์</p>
          </div>

          <div className="flex items-center gap-4">
             <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="group flex items-center gap-2 bg-[#f8f9fa] hover:bg-blue-50 text-blue-600 border border-blue-100 px-6 py-3 rounded-2xl transition-all duration-300 shadow-sm active:scale-95"
             >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              <span className="font-normal">เพิ่มบันทึกใหม่</span>
            </button>

            <div className="flex items-center">
              <Image 
                src="/images/logo.png" 
                alt="BLACKANDBREW Logo" 
                width={160} 
                height={64} 
                className="object-contain"
                priority
              />
            </div>
          </div>
        </header>

        {/* Stats / Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-3xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 font-normal uppercase tracking-wider text-[10px]">เสร็จสมบูรณ์</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-normal text-emerald-900 leading-tight">{records.filter(r => r.status === 'เสร็จสมบูรณ์').length}</div>
          </div>
          <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-3xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-normal uppercase tracking-wider text-[10px]">กำลังดำเนินการ</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-normal text-blue-900 leading-tight">{records.filter(r => r.status === 'กำลังดำเนินการ').length}</div>
          </div>
          <div className="bg-purple-50/40 border border-purple-100 p-4 rounded-3xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-purple-700 font-normal uppercase tracking-wider text-[10px]">รวมค่าใช้จ่าย</span>
              <DollarSign className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-normal text-purple-900 leading-tight">฿{records.reduce((acc, curr) => acc + (curr.cost || 0), 0).toLocaleString()}</div>
          </div>
        </div>

        {/* Records List */}
        <main className="space-y-6">
          {loading && records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-200" strokeWidth={1.5} />
              <span className="text-base tracking-wide uppercase font-normal">กำลังโหลดข้อมูล...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl py-20 flex flex-col items-center justify-center text-gray-400">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-normal">ไม่พบประวัติการซ่อมบำรุง</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-blue-500 hover:underline font-normal"
              >
                สร้างบันทึกแรกของคุณ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {records.map((record) => (
                <div 
                  key={record.id} 
                  className="bg-white border border-gray-100 p-4 rounded-3xl hover:shadow-xl hover:border-blue-100 transition-all duration-300 group relative flex flex-col h-full max-w-md mx-auto w-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${record.status === 'เสร็จสมบูรณ์' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                        {record.status === 'เสร็จสมบูรณ์' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-base font-normal text-gray-900 tracking-tight line-clamp-1">{record.equipment}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                           <span className="flex items-center gap-1 font-normal text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(record.start_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleEdit(record)}
                        className="p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 rounded-lg transition-all duration-300 active:scale-95 border border-transparent hover:border-blue-100"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => { setRecordToDelete(record.id!); setIsDeleteConfirmOpen(true); }}
                        className="p-1.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all duration-300 active:scale-95 border border-transparent hover:border-red-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                       <span className="uppercase tracking-wider font-normal text-[8px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-gray-500">
                        {record.task_type}
                      </span>
                      <div className="h-px flex-1 bg-gray-50" />
                      <div className="text-right">
                        <div className="text-base font-normal text-gray-900 tracking-tighter">
                          ฿{(record.cost || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {record.detected_problem && (
                        <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-50">
                          <span className="block text-[9px] font-normal uppercase tracking-widest text-[#000000] mb-0.5">ปัญหาที่พบ</span>
                          <p className="text-[15px] text-[#000000] font-normal line-clamp-2 leading-relaxed">{record.detected_problem}</p>
                        </div>
                      )}
                      {record.work_details && (
                        <div className="bg-white p-2.5 rounded-xl border border-gray-50">
                          <span className="block text-[9px] font-normal uppercase tracking-widest text-[#000000] mb-0.5">รายละเอียดการซ่อม</span>
                          <p className="text-[15px] text-[#000000] font-normal line-clamp-2 leading-relaxed">{record.work_details}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] font-normal text-[#000000]">
                      <User className="w-4 h-4 text-gray-400" />
                      {record.person_in_charge || 'ไม่ระบุ'}
                    </div>
                    {record.recommended_frequency && (
                      <div className="flex items-center gap-1 text-[9px] font-normal text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded-full border border-blue-100">
                        <Clock className="w-2.5 h-2.5" />
                        {record.recommended_frequency}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div>
                <h2 className="text-xl font-normal text-gray-900 tracking-tight uppercase">
                  {editingRecord ? 'แก้ไขบันทึก' : 'เพิ่มบันทึกการซ่อม'}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wider font-normal">กรอกรายละเอียดการเซอร์วิสอุปกรณ์</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-gray-200 rounded-xl transition-colors text-gray-400"
              >
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 group cursor-pointer" onClick={() => dateInputRef.current?.showPicker()}>
                  <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">วันที่เซอร์วิส</label>
                  <div className="relative h-[42px] flex items-center">
                    {formData.start_date && (
                      <div className="absolute inset-0 flex items-center px-3 text-[13px] text-[#000000] pointer-events-none z-10 bg-[#f8f9fa] rounded-xl border border-gray-100">
                        {format(parseISO(formData.start_date), 'dd/MM/yyyy')}
                      </div>
                    )}
                    <input 
                      ref={dateInputRef}
                      type="date" 
                      required
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className={`w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-3 py-2 text-[13px] text-[#000000] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all cursor-pointer relative z-0 ${formData.start_date ? 'opacity-0' : 'opacity-100'}`}
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563] pointer-events-none group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">ประเภทงาน</label>
                  <select 
                    value={formData.task_type}
                    onChange={e => setFormData({ ...formData, task_type: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="ซ่อมแซม">ซ่อมแซม</option>
                    <option value="บำรุงรักษา">บำรุงรักษา</option>
                    <option value="ติดตั้ง">ติดตั้ง</option>
                    <option value="เปลี่ยนอะไหล่">เปลี่ยนอะไหล่</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">ชื่ออุปกรณ์ / เครื่องจักร</label>
                    <input 
                    type="text" 
                    required
                    placeholder="เช่น เครื่องชงกาแฟ"
                    value={formData.equipment}
                    onChange={e => setFormData({ ...formData, equipment: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">ความถี่ที่แนะนำ</label>
                  <input 
                    type="text" 
                    placeholder="เช่น ทุก 3-4 เดือน"
                    value={formData.recommended_frequency}
                    onChange={e => setFormData({ ...formData, recommended_frequency: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">ปัญหาที่พบ</label>
                <input 
                  type="text" 
                  placeholder="รายละเอียดอาการเสียหรือปัญหา"
                  value={formData.detected_problem}
                  onChange={e => setFormData({ ...formData, detected_problem: e.target.value })}
                  className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">รายละเอียดการดำเนินการ</label>
                <input 
                  type="text" 
                  placeholder="ระบุสิ่งที่ทำไป..."
                  value={formData.work_details}
                  onChange={e => setFormData({ ...formData, work_details: e.target.value })}
                  className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">ค่าใช้จ่าย (บาท)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B5563] text-sm">฿</span>
                    <input 
                      type="number" 
                      min="0"
                      value={formData.cost === 0 ? '' : formData.cost}
                      onChange={e => {
                        const val = e.target.value.replace(/^0+/, ''); // Remove leading zeros
                        setFormData({ ...formData, cost: val === '' ? 0 : Number(val) });
                      }}
                      onFocus={e => { if (formData.cost === 0) e.target.value = ''; }}
                      className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl pl-8 pr-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">ผู้รับผิดชอบ</label>
                  <input 
                    type="text" 
                    placeholder="ชื่อผู้ดำเนินการ"
                    value={formData.person_in_charge}
                    onChange={e => setFormData({ ...formData, person_in_charge: e.target.value })}
                    className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">สถานะงาน</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'กำลังดำเนินการ' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-[12px] font-normal transition-all ${formData.status === 'กำลังดำเนินการ' ? 'bg-amber-50 border-amber-200 text-amber-600 ring-2 ring-amber-500/20' : 'bg-[#f8f9fa] border-gray-100 text-[#4B5563] hover:bg-gray-50'}`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    กำลังดำเนินการ
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'เสร็จสมบูรณ์' })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-[12px] font-normal transition-all ${formData.status === 'เสร็จสมบูรณ์' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 ring-2 ring-emerald-500/20' : 'bg-[#f8f9fa] border-gray-100 text-[#4B5563] hover:bg-gray-50'}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    เสร็จสมบูรณ์
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pb-2">
                <label className="text-[11px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">หมายเหตุเพิ่มเติม</label>
                <input 
                  type="text" 
                  placeholder="ระบุหมายเหตุ (ถ้ามี)"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-3 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                />
              </div>
            </form>

            <div className="p-6 bg-gray-50/50 border-t border-gray-50 flex gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-gray-500 font-normal hover:bg-gray-200/50 rounded-xl transition-all text-sm"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-3 bg-[#333333] text-white font-normal rounded-xl hover:bg-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300 p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-normal text-gray-900 mb-2">ยืนยันการลบข้อมูล?</h3>
            <p className="text-gray-400 text-sm mb-6">คุณไม่สามารถย้อนกลับการดำเนินการนี้ได้หลังจากลบข้อมูลสำเร็จ</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 py-3 text-gray-500 font-normal hover:bg-gray-100 rounded-xl transition-all text-sm"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-3 bg-red-500 text-white font-normal rounded-xl hover:bg-red-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                {loading ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-full duration-300 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
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
