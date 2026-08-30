import { preloadCaptureLibraries } from '@/lib/capture-element-png';
import { Plus, Undo2, Redo2, UserCog, Calendar, Download, Settings, RefreshCw } from 'lucide-react';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { HintTooltip } from '@/components/ui/hint-tooltip';

interface ScheduleToolbarProps {
  isReadOnly: boolean;
  undoStackLength: number;
  redoStackLength: number;
  onUndo: () => void;
  onRedo: () => void;
  initialDateStr: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShowRegularHolidayModal: () => void;
  onShowManagementModal: () => void;
  onExportScheduleImage: () => void;
  onSyncGoogleSheet: () => void;
  isSyncingGoogleSheet: boolean;
  syncWeekLabel?: string;
  onShowAddEmployeeModal: () => void;
  onShowShiftSettings: () => void;
}

export default function ScheduleToolbar({
  isReadOnly,
  undoStackLength,
  redoStackLength,
  onUndo,
  onRedo,
  initialDateStr,
  onDateChange,
  onShowRegularHolidayModal,
  onShowManagementModal,
  onExportScheduleImage,
  onSyncGoogleSheet,
  isSyncingGoogleSheet,
  syncWeekLabel,
  onShowAddEmployeeModal,
  onShowShiftSettings,
}: ScheduleToolbarProps) {
  return (
    <header className="bb-schedule-toolbar md:h-14 border-b border-border px-4 md:px-6 flex flex-col md:flex-row items-center justify-between bg-transparent shrink-0 z-20 shadow-sm py-2 md:py-0">
      <div className="flex items-center justify-between w-full md:w-auto gap-6 mb-2 md:mb-0">
        <div className="flex items-center gap-2">
          <HintTooltip tip="เลิกทำ">
            <button
              onClick={onUndo}
              disabled={isReadOnly || undoStackLength === 0}
              className={`h-11 px-3 rounded-3xl bb-transition duration-200 active:scale-95 flex items-center justify-center ${!isReadOnly && undoStackLength > 0 ? 'hover:bg-muted/30 text-foreground cursor-pointer' : 'text-foreground/30 cursor-not-allowed'}`}
              aria-label="เลิกทำ"
            >
              <Undo2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </HintTooltip>
          <HintTooltip tip="ทำซ้ำ">
            <button
              onClick={onRedo}
              disabled={isReadOnly || redoStackLength === 0}
              className={`h-11 px-3 rounded-3xl bb-transition duration-200 active:scale-95 flex items-center justify-center ${!isReadOnly && redoStackLength > 0 ? 'hover:bg-muted/30 text-foreground cursor-pointer' : 'text-foreground/30 cursor-not-allowed'}`}
              aria-label="ทำซ้ำ"
            >
              <Redo2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </HintTooltip>
        </div>
        <div className="flex items-center">
          <ClickableDatePicker
            value={initialDateStr}
            onChange={onDateChange}
            containerClassName="w-fit h-11 scale-100 origin-right"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 w-full overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y whitespace-nowrap pb-2 scrollbar-none md:overflow-visible md:pb-0 md:justify-end">
        <button
          onClick={onExportScheduleImage}
          onMouseEnter={preloadCaptureLibraries}
          onFocus={preloadCaptureLibraries}
          className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/30 rounded-3xl border border-border bb-transition duration-200 active:scale-95 cursor-pointer uppercase tracking-wide shadow-sm"
        >
          <Download className="w-4 h-4" />
          บันทึกรูปภาพ
        </button>

        <button
          onClick={onShowShiftSettings}
          className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/30 rounded-3xl border border-border bb-transition duration-200 active:scale-95 uppercase tracking-wide shadow-sm cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          ตั้งค่า
        </button>

        <button
          onClick={onShowRegularHolidayModal}
          disabled={isReadOnly}
          className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/30 rounded-3xl border border-border bb-transition duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          วันหยุดประจำ
        </button>

        <button
          onClick={onShowManagementModal}
          disabled={isReadOnly}
          className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/30 rounded-3xl border border-border bb-transition duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <UserCog className="w-4 h-4" />
          การลา/เปลี่ยนกะ
        </button>

        <HintTooltip
          tip={
            syncWeekLabel
              ? `ส่งสัปดาห์ ${syncWeekLabel} ไป Google Sheet (กดปุ่มเท่านั้น — ไม่ซิงค์อัตโนมัติ)`
              : 'ส่งสัปดาห์ที่กำลังดูไป Google Sheet (กดปุ่มเท่านั้น — ไม่ซิงค์อัตโนมัติ)'
          }
        >
          <button
            onClick={onSyncGoogleSheet}
            disabled={isReadOnly || isSyncingGoogleSheet}
            className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/30 rounded-3xl border border-border bb-transition duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            {isSyncingGoogleSheet ? 'กำลังซิงค์…' : 'ซิงค์ Google Sheet'}
          </button>
        </HintTooltip>

        <button
          onClick={onShowAddEmployeeModal}
          disabled={isReadOnly}
          className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/30 rounded-3xl border border-border bb-transition duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          เพิ่มพนักงาน
        </button>
      </div>
    </header>
  );
}
