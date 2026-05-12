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
    <div className="min-h-screen bg-transparent p-4 md:p-12 text-[#000000] relative font-normal">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-[#000000]/5">
          <div className="space-y-2">
            <h1 className="text-5xl font-normal tracking-tighter text-[#000000] uppercase flex items-center gap-4">
              <Wrench className="w-10 h-10 text-[#000000]" strokeWidth={1} />
              Maintenance
            </h1>
            <p className="text-[#000000]/60 text-sm font-normal uppercase tracking-[0.2em] px-1">Equipment Service History</p>
          </div>

          <div className="flex items-center gap-6">
             <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="group flex items-center gap-3 bg-[#000000] hover:bg-[#1a1a1a] text-white px-8 py-4 rounded-3xl transition-all duration-500 shadow-lg active:scale-95"
             >
              <Plus className="w-5 h-5 transition-transform duration-500 group-hover:rotate-90" />
              <span className="font-normal tracking-wide">New Record</span>
            </button>
          </div>
        </header>

        {/* Stats / Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#eff6ff] p-8 rounded-[32px] space-y-4 border-none shadow-sm group hover:shadow-md transition-all duration-500">
            <div className="flex items-center justify-between">
              <span className="text-[#000000]/40 font-normal uppercase tracking-widest text-[11px]">Completed</span>
              <div className="p-2 bg-white/50 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-[#3b82f6]" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-5xl font-normal text-[#000000] tracking-tighter">
                {records.filter(r => r.status === 'เสร็จสมบูรณ์').length}
              </div>
              <span className="text-sm text-[#000000]/30 font-normal uppercase tracking-wider">Units</span>
            </div>
          </div>

          <div className="bg-[#f0fdf4] p-8 rounded-[32px] space-y-4 border-none shadow-sm group hover:shadow-md transition-all duration-500">
            <div className="flex items-center justify-between">
              <span className="text-[#000000]/40 font-normal uppercase tracking-widest text-[11px]">In Progress</span>
              <div className="p-2 bg-white/50 rounded-xl">
                <Clock className="w-5 h-5 text-[#10b981]" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-5xl font-normal text-[#000000] tracking-tighter">
                {records.filter(r => r.status === 'กำลังดำเนินการ').length}
              </div>
              <span className="text-sm text-[#000000]/30 font-normal uppercase tracking-wider">Tasks</span>
            </div>
          </div>

          <div className="bg-[#fff7ed] p-8 rounded-[32px] space-y-4 border-none shadow-sm group hover:shadow-md transition-all duration-500">
            <div className="flex items-center justify-between">
              <span className="text-[#000000]/40 font-normal uppercase tracking-widest text-[11px]">Total Expenses</span>
              <div className="p-2 bg-white/50 rounded-xl">
                <DollarSign className="w-5 h-5 text-[#f59e0b]" strokeWidth={1.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-normal text-[#000000]/40 tracking-tighter mr-1">฿</span>
              <div className="text-5xl font-normal text-[#000000] tracking-tighter">
                {records.reduce((acc, curr) => acc + (curr.cost || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {records.map((record) => (
                <div 
                  key={record.id} 
                  className="bg-white border-none p-8 rounded-[32px] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-700 group flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-3xl ${record.status === 'เสร็จสมบูรณ์' ? 'bg-[#f0fdf4] text-[#10b981]' : 'bg-[#eff6ff] text-[#3b82f6]'}`}>
                        {record.status === 'เสร็จสมบูรณ์' ? <CheckCircle2 className="w-5 h-5" strokeWidth={1.5} /> : <Clock className="w-5 h-5" strokeWidth={1.5} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-normal text-[#000000] tracking-tight leading-none mb-2">{record.equipment}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-[#000000]/40 uppercase tracking-widest">
                           <Calendar className="w-3 h-3" />
                           {format(new Date(record.start_date), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <button 
                        onClick={() => handleEdit(record)}
                        className="p-2 bg-[#fff3dd] hover:bg-[#ffe8b3] text-[#000000] rounded-xl transition-all duration-300 active:scale-90"
                      >
                        <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => { setRecordToDelete(record.id!); setIsDeleteConfirmOpen(true); }}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all duration-300 active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                       <span className="uppercase tracking-[0.2em] font-normal text-[9px] text-[#000000]/40">
                        {record.task_type}
                      </span>
                      <div className="h-[1px] flex-1 bg-[#000000]/5" />
                      <div className="text-xl font-normal text-[#000000] tracking-tighter">
                        ฿{(record.cost || 0).toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {record.detected_problem && (
                        <div className="space-y-2">
                          <span className="block text-[10px] font-normal uppercase tracking-[0.2em] text-[#000000]/30">Observed Issue</span>
                          <p className="text-base text-[#000000]/80 font-normal leading-relaxed">{record.detected_problem}</p>
                        </div>
                      )}
                      {record.work_details && (
                        <div className="space-y-2">
                          <span className="block text-[10px] font-normal uppercase tracking-[0.2em] text-[#000000]/30">Service Performed</span>
                          <p className="text-base text-[#000000]/80 font-normal leading-relaxed">{record.work_details}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-[#000000]/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-normal text-[#000000]/60">
                      <div className="w-6 h-6 rounded-full bg-[#fff3dd] flex items-center justify-center text-[10px]">
                        {record.person_in_charge?.[0] || '?'}
                      </div>
                      {record.person_in_charge || 'Unknown'}
                    </div>
                    {record.recommended_frequency && (
                      <div className="text-[10px] font-normal text-[#000000]/40 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-3 h-3" />
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
            <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border-none animate-in fade-in zoom-in duration-500">
            <div className="p-8 border-b border-[#000000]/5 flex items-center justify-between bg-[#fff3dd]/30">
              <div>
                <h2 className="text-2xl font-normal text-[#000000] tracking-tighter uppercase">
                  {editingRecord ? 'Edit Record' : 'New Maintenance Entry'}
                </h2>
                <p className="text-[11px] text-[#000000]/40 mt-1 uppercase tracking-widest font-normal">Service Details & Equipment Status</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-[#000000]/5 rounded-3xl transition-colors text-[#000000]"
              >
                <ChevronRight className="w-6 h-6 rotate-90" strokeWidth={1} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 group cursor-pointer" onClick={() => dateInputRef.current?.showPicker()}>
                  <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Service Date</label>
                  <div className="relative h-[52px] flex items-center bg-[#f8f9fa] border-none rounded-3xl px-4 py-3 cursor-pointer transition-all">
                    <span className="text-sm text-[#000000] flex-1">
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
                    <Calendar className="w-4 h-4 text-[#000000]/40 group-hover:text-[#000000] transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Task Type</label>
                  <select 
                    value={formData.task_type}
                    onChange={e => setFormData({ ...formData, task_type: e.target.value })}
                    className="w-full h-[52px] bg-[#f8f9fa] border-none rounded-3xl px-4 py-3 text-sm focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="ซ่อมแซม">ซ่อมแซม (Repair)</option>
                    <option value="บำรุงรักษา">บำรุงรักษา (Maintenance)</option>
                    <option value="ติดตั้ง">ติดตั้ง (Installation)</option>
                    <option value="เปลี่ยนอะไหล่">เปลี่ยนอะไหล่ (Replacement)</option>
                    <option value="อื่นๆ">อื่นๆ (Others)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Equipment Name</label>
                    <input 
                    type="text" 
                    required
                    placeholder="e.g. Espresso Machine"
                    value={formData.equipment}
                    onChange={e => setFormData({ ...formData, equipment: e.target.value })}
                    className="w-full h-[52px] bg-[#f8f9fa] border-none rounded-3xl px-4 py-3 text-sm focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Recommended Frequency</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Every 3 months"
                    value={formData.recommended_frequency}
                    onChange={e => setFormData({ ...formData, recommended_frequency: e.target.value })}
                    className="w-full h-[52px] bg-[#f8f9fa] border-none rounded-3xl px-4 py-3 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Problem Detected</label>
                <textarea 
                  placeholder="Describe the issue..."
                  rows={2}
                  value={formData.detected_problem}
                  onChange={e => setFormData({ ...formData, detected_problem: e.target.value })}
                  className="w-full bg-[#f8f9fa] border-none rounded-3xl px-4 py-3 text-sm focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Work Details</label>
                <textarea 
                  placeholder="What was done?"
                  rows={2}
                  value={formData.work_details}
                  onChange={e => setFormData({ ...formData, work_details: e.target.value })}
                  className="w-full bg-[#f8f9fa] border-none rounded-3xl px-4 py-3 text-sm focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Cost (THB)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000]/40 text-sm">฿</span>
                    <input 
                      type="number" 
                      min="0"
                      value={formData.cost === 0 ? '' : formData.cost}
                      onChange={e => {
                        const val = e.target.value.replace(/^0+/, '');
                        setFormData({ ...formData, cost: val === '' ? 0 : Number(val) });
                      }}
                      className="w-full h-[52px] bg-[#f8f9fa] border-none rounded-3xl pl-8 pr-4 py-3 text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Person in Charge</label>
                  <input 
                    type="text" 
                    placeholder="Technician Name"
                    value={formData.person_in_charge}
                    onChange={e => setFormData({ ...formData, person_in_charge: e.target.value })}
                    className="w-full h-[52px] bg-[#f8f9fa] border-none rounded-3xl px-4 py-3 text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Job Status</label>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'กำลังดำเนินการ' })}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl text-xs font-normal transition-all duration-500 ${formData.status === 'กำลังดำเนินการ' ? 'bg-[#eff6ff] text-[#3b82f6] shadow-sm' : 'bg-[#f8f9fa] text-[#000000]/40 hover:bg-gray-100'}`}
                  >
                    <Clock className="w-4 h-4" strokeWidth={1.5} />
                    In Progress
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'เสร็จสมบูรณ์' })}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-3xl text-xs font-normal transition-all duration-500 ${formData.status === 'เสร็จสมบูรณ์' ? 'bg-[#f0fdf4] text-[#10b981] shadow-sm' : 'bg-[#f8f9fa] text-[#000000]/40 hover:bg-gray-100'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                    Completed
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-normal uppercase tracking-[0.2em] text-[#000000]/40 ml-1">Notes</label>
                <input 
                  type="text" 
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-[52px] bg-[#f8f9fa] border-none rounded-3xl px-4 py-3 text-sm focus:outline-none transition-all"
                />
              </div>
            </form>

            <div className="p-8 bg-gray-50/30 border-t border-[#000000]/5 flex gap-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 text-[#000000]/40 font-normal hover:text-[#000000] transition-all text-sm uppercase tracking-widest"
              >
                Dismiss
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex-[2] py-4 bg-[#000000] text-white font-normal rounded-3xl hover:bg-[#1a1a1a] transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" strokeWidth={1.5} />}
                Confirm Entry
              </button>
            </div>
          </div>
        </div>
      )}

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
