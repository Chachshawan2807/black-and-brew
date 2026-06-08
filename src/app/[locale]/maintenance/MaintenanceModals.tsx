'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  ClipboardList,
  ChevronRight,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { fadeOverlay, modalContent } from '@/lib/motion-presets';

export interface MaintenanceFormData {
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
}

type MaintenanceModalsProps = {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isDeleteConfirmOpen: boolean;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  editingRecord: { id?: string } | null;
  formData: MaintenanceFormData;
  setFormData: React.Dispatch<React.SetStateAction<MaintenanceFormData>>;
  handleSubmit: (e: React.FormEvent) => void;
  handleDelete: () => void;
  loading: boolean;
  isReadOnly: boolean;
};

export default function MaintenanceModals({
  isModalOpen,
  setIsModalOpen,
  isDeleteConfirmOpen,
  setIsDeleteConfirmOpen,
  editingRecord,
  formData,
  setFormData,
  handleSubmit,
  handleDelete,
  loading,
  isReadOnly,
}: MaintenanceModalsProps) {
  return (
    <>
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={fadeOverlay.initial}
              animate={fadeOverlay.animate}
              exit={fadeOverlay.exit}
              transition={fadeOverlay.transition}
              className="absolute inset-0 bg-black/10 backdrop-blur-sm bb-modal-backdrop"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={modalContent.initial}
              animate={modalContent.animate}
              exit={modalContent.exit}
              transition={modalContent.transition}
              className="relative bg-[#fdfcf0] w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-black/5"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-2xl transition-colors text-black/40 z-10"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
              <div className="p-5 border-b border-black/5 flex items-center justify-between shrink-0 pr-14">
                <div>
                  <h2 className="text-xl font-normal text-black tracking-tight uppercase">
                    {editingRecord ? 'แก้ไขบันทึก' : 'เพิ่มบันทึกใหม่'}
                  </h2>
                  <p className="text-[13px] text-black/60 mt-0.5 uppercase tracking-widest font-normal">รายละเอียดการซ่อมและสถานะอุปกรณ์</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar bg-[#fdfcf0]">
                <div className={isReadOnly ? 'pointer-events-none opacity-60' : ''}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">วันที่รับบริการ</label>
                      <ClickableDatePicker
                        value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        placeholder="เลือกวันที่"
                        disabled={isReadOnly}
                        containerClassName="bg-black/[0.02] border-black/[0.05] hover:border-black/10 hover:bg-black/[0.04] transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ประเภทงาน</label>
                      <div className="relative">
                        <select
                          value={formData.task_type}
                          onChange={e => setFormData({ ...formData, task_type: e.target.value })}
                          disabled={isReadOnly}
                          className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-base md:text-sm font-normal focus:outline-none transition-all appearance-none cursor-pointer hover:bg-black/[0.04] disabled:opacity-60 disabled:cursor-not-allowed"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ชื่ออุปกรณ์</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น เครื่องชงเอสเปรสโซ"
                        value={formData.equipment}
                        onChange={e => setFormData({ ...formData, equipment: e.target.value })}
                        className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-base md:text-sm font-normal focus:outline-none transition-all hover:bg-black/[0.04]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ความถี่ที่แนะนำ</label>
                      <input
                        type="text"
                        placeholder="เช่น ทุก 3 เดือน"
                        value={formData.recommended_frequency}
                        onChange={e => setFormData({ ...formData, recommended_frequency: e.target.value })}
                        className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-base md:text-sm font-normal focus:outline-none transition-all hover:bg-black/[0.04]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">ค่าใช้จ่าย (บาท)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 text-base md:text-sm font-normal">฿</span>
                        <input
                          type="number"
                          min="0"
                          value={formData.cost === 0 ? '' : formData.cost}
                          onChange={e => {
                            const val = e.target.value.replace(/^0+/, '');
                            setFormData({ ...formData, cost: val === '' ? 0 : Number(val) });
                          }}
                          className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl pl-8 pr-4 py-2 text-base md:text-sm font-normal focus:outline-none transition-all hover:bg-black/[0.04]"
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
                        className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-base md:text-sm font-normal focus:outline-none transition-all hover:bg-black/[0.04]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">อาการที่พบ</label>
                      <textarea
                        placeholder="อธิบายปัญหา"
                        rows={2}
                        value={formData.detected_problem}
                        onChange={e => setFormData({ ...formData, detected_problem: e.target.value })}
                        className="w-full bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2.5 text-base md:text-sm font-normal focus:outline-none transition-all resize-none hover:bg-black/[0.04]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-black/60 ml-1">รายละเอียดการซ่อม</label>
                      <textarea
                        placeholder="ดำเนินการอะไรบ้าง?"
                        rows={2}
                        value={formData.work_details}
                        onChange={e => setFormData({ ...formData, work_details: e.target.value })}
                        className="w-full bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2.5 text-base md:text-sm font-normal focus:outline-none transition-all resize-none hover:bg-black/[0.04]"
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
                          disabled={isReadOnly}
                          className={`flex-1 flex items-center justify-center gap-2 h-11 md:h-auto md:py-3 rounded-2xl text-base md:text-[13px] font-normal transition-all disabled:opacity-60 disabled:cursor-not-allowed ${formData.status === 'กำลังดำเนินการ' ? 'bg-[#f0f9ff] text-[#0284c7] border border-[#e0f2fe] shadow-sm' : 'bg-black/[0.02] text-black/30 hover:bg-black/[0.05]'}`}
                        >
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                          กำลังดำเนินการ
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, status: 'เสร็จสมบูรณ์' })}
                          disabled={isReadOnly}
                          className={`flex-1 flex items-center justify-center gap-2 h-11 md:h-auto md:py-3 rounded-2xl text-base md:text-[13px] font-normal transition-all disabled:opacity-60 disabled:cursor-not-allowed ${formData.status === 'เสร็จสมบูรณ์' ? 'bg-[#f0fdf4] text-[#10b981] border border-[#dcfce7] shadow-sm' : 'bg-black/[0.02] text-black/30 hover:bg-black/[0.05]'}`}
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
                        className="w-full h-11 bg-black/[0.02] border border-black/[0.05] rounded-2xl px-4 py-2 text-base md:text-sm font-normal focus:outline-none transition-all hover:bg-black/[0.04]"
                      />
                    </div>
                  </div>
                </div>
              </form>

              <div className="p-5 bg-[#fdfcf0] border-t border-black/5 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 md:h-auto md:py-3 text-black/60 font-normal hover:text-black transition-all text-base md:text-[12px] uppercase tracking-widest"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || isReadOnly}
                  className="flex-[2] h-11 md:h-auto md:py-3 bg-black text-white font-normal rounded-2xl hover:bg-black/80 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base md:text-[12px] uppercase tracking-widest"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" strokeWidth={2} />}
                  ยืนยันบันทึก
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-md bb-modal-backdrop" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="relative bg-[#fdfcf0] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-black/5 bb-modal-panel p-10 text-center">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-2xl transition-colors text-black/40 z-10"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-10 h-10" strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-normal text-black tracking-tighter mb-2 uppercase">Delete Record?</h3>
            <p className="text-black/40 text-sm font-normal mb-8 leading-relaxed">This action is irreversible and will permanently remove this maintenance entry from the vault.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                disabled={loading || isReadOnly}
                className="w-full h-11 md:h-auto md:py-4 bg-red-500 text-white font-normal rounded-3xl hover:bg-red-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-sm uppercase tracking-widest"
              >
                {loading ? 'Processing...' : 'Confirm Deletion'}
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="w-full h-11 md:h-auto md:py-4 text-black/40 font-normal hover:text-black transition-all text-base md:text-sm uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
