'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import { CloseIcon } from '@/components/ui/close-icon';
import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Save,
  Trash2,
  ICON_STROKE,
} from '@/lib/icons';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { RoundedSelect } from '@/components/ui/rounded-select';
import { fadeOverlay, modalContent } from '@/lib/motion-presets';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import {
  getTaskTypeInputValue,
  getTaskTypeSelectValue,
  getUniqueEquipmentSuggestions,
  TASK_TYPE_PRESETS,
  type ServiceRecordFormInput,
} from '@/lib/maintenance/service-record-form';
import { cn } from '@/lib/utils';
import { bindPointerSafeOptionSelect } from '@/lib/pointer-overlay-selection';

export type MaintenanceFormData = ServiceRecordFormInput;

const fieldClass =
  'w-full h-11 bg-background border border-border rounded-2xl px-4 py-2 text-base md:text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none focus:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10 bb-transition hover:bg-muted/30';

const textareaClass =
  'w-full bg-background border border-border rounded-2xl px-4 py-2.5 text-base md:text-sm font-normal text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none focus:border-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/10 bb-transition resize-none hover:bg-muted/30';

type MaintenanceModalsProps = {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  isDeleteConfirmOpen: boolean;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  editingRecord: { id?: string } | null;
  formData: MaintenanceFormData;
  setFormData: React.Dispatch<React.SetStateAction<MaintenanceFormData>>;
  equipmentSuggestions: string[];
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
  equipmentSuggestions,
  handleSubmit,
  handleDelete,
  loading,
  isReadOnly,
}: MaintenanceModalsProps) {
  const equipmentListId = useId();
  const equipmentRootRef = useRef<HTMLDivElement>(null);
  const [showEquipmentSuggestions, setShowEquipmentSuggestions] = useState(false);
  const [highlightedEquipmentIndex, setHighlightedEquipmentIndex] = useState(-1);
  const [prevModalOpen, setPrevModalOpen] = useState(isModalOpen);

  const taskTypeSelect = getTaskTypeSelectValue(formData.task_type);
  const taskTypeCustom = getTaskTypeInputValue(formData.task_type);
  const filteredEquipmentSuggestions = getUniqueEquipmentSuggestions(
    equipmentSuggestions,
    formData.equipment,
  );
  const showEquipmentList =
    showEquipmentSuggestions && filteredEquipmentSuggestions.length > 0 && !isReadOnly;

  if (isModalOpen !== prevModalOpen) {
    setPrevModalOpen(isModalOpen);
    if (!isModalOpen) {
      setShowEquipmentSuggestions(false);
      setHighlightedEquipmentIndex(-1);
    }
  }

  const selectEquipmentSuggestion = (value: string) => {
    setFormData(prev => ({ ...prev, equipment: value }));
    setShowEquipmentSuggestions(false);
    setHighlightedEquipmentIndex(-1);
  };

  const handleEquipmentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showEquipmentList) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedEquipmentIndex(prev =>
        prev < filteredEquipmentSuggestions.length - 1 ? prev + 1 : 0,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedEquipmentIndex(prev =>
        prev > 0 ? prev - 1 : filteredEquipmentSuggestions.length - 1,
      );
      return;
    }

    if (event.key === 'Enter' && highlightedEquipmentIndex >= 0) {
      event.preventDefault();
      const selected = filteredEquipmentSuggestions[highlightedEquipmentIndex];
      if (selected) selectEquipmentSuggestion(selected);
      return;
    }

    if (event.key === 'Escape') {
      setShowEquipmentSuggestions(false);
      setHighlightedEquipmentIndex(-1);
    }
  };
  return (
    <>
      <AnimatePresence>
        {isModalOpen && (
          <ModalPortal>
            <div
              key="maintenance-form-modal"
              className={cn(
                'fixed inset-0 flex items-center justify-center p-4',
                INVENTORY_MODAL_Z_CLASS,
              )}
            >
              <motion.div
                initial={fadeOverlay.initial}
                animate={fadeOverlay.animate}
                exit={fadeOverlay.exit}
                transition={fadeOverlay.transition}
                className="absolute inset-0 bg-black/10 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
              />
              <motion.div
                initial={modalContent.initial}
                animate={modalContent.animate}
                exit={modalContent.exit}
                transition={modalContent.transition}
                className="relative bg-card w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bb-shadow-xl overflow-hidden border border-border"
              >
              <HintTooltip tip="ปิด">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-2xl transition-colors text-foreground/40 z-10"
                  aria-label="ปิด"
                >
                  <CloseIcon />
                </button>
              </HintTooltip>
              <div className="p-5 border-b border-border flex items-center justify-between shrink-0 pr-14">
                <div>
                  <h2 className="text-xl font-normal text-foreground tracking-tight uppercase">
                    {editingRecord ? 'แก้ไขบันทึก' : 'เพิ่มบันทึกใหม่'}
                  </h2>
                  <p className="text-[13px] text-foreground/60 mt-0.5 uppercase tracking-widest font-normal">รายละเอียดการซ่อมและสถานะอุปกรณ์</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto bb-smooth-scroll custom-scrollbar bg-card">
                <div className={isReadOnly ? 'pointer-events-none opacity-60' : ''}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-foreground ml-1">วันที่ดำเนินการ</label>
                      <ClickableDatePicker
                        value={formData.start_date}
                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        placeholder="เลือกวันที่"
                        disabled={isReadOnly}
                        containerClassName="w-full"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-foreground ml-1">ประเภทงาน</label>
                      <RoundedSelect
                        value={taskTypeSelect}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            task_type: value === 'อื่นๆ' ? 'อื่นๆ' : value,
                          }));
                        }}
                        wrapperClassName="w-full"
                      >
                        {TASK_TYPE_PRESETS.map(preset => (
                          <option key={preset} value={preset}>
                            {preset}
                          </option>
                        ))}
                      </RoundedSelect>
                      {taskTypeSelect === 'อื่นๆ' && (
                        <>
                          <label htmlFor="maintenance-task-type-custom" className="sr-only">
                            ระบุประเภทงาน
                          </label>
                          <input
                            id="maintenance-task-type-custom"
                            type="text"
                            name="task_type_custom"
                            autoComplete="off"
                            placeholder="ระบุประเภทงาน…"
                            value={taskTypeCustom}
                          onChange={e =>
                            setFormData(prev => ({
                              ...prev,
                              task_type: e.target.value.trim() === '' ? 'อื่นๆ' : e.target.value,
                            }))
                          }
                          disabled={isReadOnly}
                          className={fieldClass}
                        />
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      ref={equipmentRootRef}
                      className="space-y-1.5 relative"
                      onBlur={e => {
                        const next = e.relatedTarget as Node | null;
                        if (next && equipmentRootRef.current?.contains(next)) return;
                        window.setTimeout(() => setShowEquipmentSuggestions(false), 150);
                      }}
                    >
                      <label htmlFor="maintenance-equipment" className="text-[13px] font-normal uppercase tracking-widest text-foreground ml-1">ชื่ออุปกรณ์</label>
                      <input
                        id="maintenance-equipment"
                        name="equipment"
                        type="text"
                        required
                        placeholder="เช่น เครื่องชงเอสเปรสโซ"
                        value={formData.equipment}
                        onChange={e => {
                          setFormData(prev => ({ ...prev, equipment: e.target.value }));
                          setShowEquipmentSuggestions(true);
                          setHighlightedEquipmentIndex(-1);
                        }}
                        onFocus={() => setShowEquipmentSuggestions(true)}
                        onKeyDown={handleEquipmentKeyDown}
                        role="combobox"
                        aria-expanded={showEquipmentList}
                        aria-controls={showEquipmentList ? equipmentListId : undefined}
                        aria-autocomplete="list"
                        aria-activedescendant={
                          showEquipmentList && highlightedEquipmentIndex >= 0
                            ? `${equipmentListId}-option-${highlightedEquipmentIndex}`
                            : undefined
                        }
                        className={fieldClass}
                      />
                      {showEquipmentList && (
                        <ul
                          id={equipmentListId}
                          role="listbox"
                          className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-2xl border border-border bg-card bb-shadow-lg"
                        >
                          {filteredEquipmentSuggestions.map((suggestion, index) => (
                            <li
                              key={suggestion}
                              id={`${equipmentListId}-option-${index}`}
                              role="option"
                              aria-selected={highlightedEquipmentIndex === index}
                            >
                              <button
                                type="button"
                                className={cn(
                                  'w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors touch-manipulation',
                                  highlightedEquipmentIndex === index
                                    ? 'bg-muted'
                                    : 'hover:bg-muted/60',
                                )}
                                {...bindPointerSafeOptionSelect(() =>
                                  selectEquipmentSuggestion(suggestion),
                                )}
                              >
                                {suggestion}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="maintenance-frequency" className="text-[13px] font-normal uppercase tracking-widest text-foreground ml-1">ดำเนินการทุก (เดือน)</label>
                      <input
                        id="maintenance-frequency"
                        name="recommended_frequency"
                        type="number"
                        min="1"
                        inputMode="numeric"
                        placeholder="เช่น 3"
                        value={formData.recommended_frequency}
                        onChange={e => {
                          const val = e.target.value.replace(/^0+(?=\d)/, '');
                          setFormData(prev => ({ ...prev, recommended_frequency: val }));
                        }}
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-foreground ml-1">อาการที่พบ</label>
                      <textarea
                        name="maintenance-detected-problem"
                        placeholder="อธิบายปัญหา"
                        rows={2}
                        value={formData.detected_problem}
                        onChange={e => setFormData({ ...formData, detected_problem: e.target.value })}
                        className={textareaClass}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-normal uppercase tracking-widest text-foreground ml-1">รายละเอียดการซ่อม</label>
                      <textarea
                        name="maintenance-work-details"
                        placeholder="ดำเนินการอะไรบ้าง?"
                        rows={2}
                        value={formData.work_details}
                        onChange={e => setFormData({ ...formData, work_details: e.target.value })}
                        className={textareaClass}
                      />
                    </div>
                  </div>
                </div>
              </form>

              <div className="p-5 bg-card border-t border-border flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 md:h-auto md:py-3 text-foreground/60 font-normal hover:text-foreground bb-transition text-base md:text-[12px] uppercase tracking-widest"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || isReadOnly}
                  className="flex-[2] h-11 md:h-auto md:py-3 bg-foreground text-background font-normal rounded-2xl hover:opacity-90 bb-transition bb-shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base md:text-[12px] uppercase tracking-widest"
                >
                  {loading ? <LoadingIcon size="md" /> : <Save className="w-4 h-4" strokeWidth={ICON_STROKE} />}
                  ยืนยันบันทึก
                </button>
              </div>
            </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      <ModalPortal>
      <FadeModalScaffold
        open={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          zIndex={220}
          overlayClassName="bg-black/5 backdrop-blur-md"
          panelClassName="relative bg-card w-full max-w-sm rounded-3xl bb-shadow-xl overflow-hidden border border-border p-10 text-center"
          aria-label="ลบบันทึก?"
        >
            <HintTooltip tip="ปิด">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-2xl transition-colors text-foreground/40 z-10"
                aria-label="ปิด"
              >
                <CloseIcon />
              </button>
            </HintTooltip>
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-10 h-10" strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-normal text-foreground tracking-tighter mb-2 uppercase">ลบบันทึก?</h3>
            <p className="text-foreground/40 text-sm font-normal mb-8 leading-relaxed">การดำเนินการนี้ไม่สามารถย้อนกลับได้ และจะลบบันทึกการซ่อมบำรุงนี้อย่างถาวร</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                disabled={loading || isReadOnly}
                className="w-full h-11 md:h-auto md:py-4 bg-red-500 text-white font-normal rounded-3xl hover:bg-red-600 bb-transition bb-shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-sm uppercase tracking-widest"
              >
                {loading ? 'กำลังดำเนินการ...' : 'ยืนยันการลบ'}
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="w-full h-11 md:h-auto md:py-4 text-foreground/40 font-normal hover:text-foreground bb-transition text-base md:text-sm uppercase tracking-widest"
              >
                ยกเลิก
              </button>
            </div>
        </FadeModalScaffold>
      </ModalPortal>
    </>
  );
}
