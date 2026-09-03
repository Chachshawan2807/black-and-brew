import { preloadCaptureLibraries } from '@/lib/capture-element-png';
import {
  Plus,
  Undo2,
  Redo2,
  UserCog,
  Calendar,
  CalendarDays,
  Download,
  Settings,
  RefreshCw,
} from '@/lib/icons';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';
import { shouldShowPageTitle } from '@/lib/sidebar-menu-labels';

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
  weekRangeLabel?: string;
  onShowAddEmployeeModal: () => void;
  onShowShiftSettings: () => void;
}

const TOOLBAR_BUTTON_CLASS =
  'flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/30 rounded-3xl border border-border bb-transition duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer';

const HISTORY_BUTTON_CLASS =
  'h-11 px-3 rounded-3xl bb-transition duration-200 active:scale-95 flex items-center justify-center';

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
  weekRangeLabel,
  onShowAddEmployeeModal,
  onShowShiftSettings,
}: ScheduleToolbarProps) {
  return (
    <header className="bb-schedule-toolbar shrink-0 border-b border-border bg-card/70 backdrop-blur-sm px-3 py-3 md:px-5 md:py-3">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-background/80 text-foreground">
                <CalendarDays className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                {shouldShowPageTitle('ตารางงาน') ? (
                  <h1 className="text-[15px] font-normal text-foreground">ตารางงาน</h1>
                ) : null}
                {weekRangeLabel ? (
                  <p className="hidden truncate text-[12px] text-muted-foreground md:block">
                    {weekRangeLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <HintTooltip tip="เลิกทำ">
              <button
                onClick={onUndo}
                disabled={isReadOnly || undoStackLength === 0}
                className={cn(
                  HISTORY_BUTTON_CLASS,
                  !isReadOnly && undoStackLength > 0
                    ? 'hover:bg-muted/30 text-foreground cursor-pointer'
                    : 'text-foreground/30 cursor-not-allowed',
                )}
                aria-label="เลิกทำ"
              >
                <Undo2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </HintTooltip>
            <HintTooltip tip="ทำซ้ำ">
              <button
                onClick={onRedo}
                disabled={isReadOnly || redoStackLength === 0}
                className={cn(
                  HISTORY_BUTTON_CLASS,
                  !isReadOnly && redoStackLength > 0
                    ? 'hover:bg-muted/30 text-foreground cursor-pointer'
                    : 'text-foreground/30 cursor-not-allowed',
                )}
                aria-label="ทำซ้ำ"
              >
                <Redo2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </HintTooltip>
            <ClickableDatePicker
              value={initialDateStr}
              onChange={onDateChange}
              containerClassName="w-fit h-11 scale-100 origin-right"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y whitespace-nowrap pb-0.5 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:whitespace-normal">
          <div className="flex items-center gap-2">
            <button
              onClick={onExportScheduleImage}
              onMouseEnter={preloadCaptureLibraries}
              onFocus={preloadCaptureLibraries}
              className={TOOLBAR_BUTTON_CLASS}
            >
              <Download className="w-4 h-4" />
              บันทึกรูปภาพ
            </button>

            <button onClick={onShowShiftSettings} className={TOOLBAR_BUTTON_CLASS}>
              <Settings className="w-4 h-4" />
              ตั้งค่า
            </button>
          </div>

          <span className="hidden h-6 w-px shrink-0 bg-border md:block" aria-hidden />

          <div className="flex items-center gap-2">
            <button
              onClick={onShowRegularHolidayModal}
              disabled={isReadOnly}
              className={TOOLBAR_BUTTON_CLASS}
            >
              <Calendar className="w-4 h-4" />
              วันหยุดประจำ
            </button>

            <button
              onClick={onShowManagementModal}
              disabled={isReadOnly}
              className={TOOLBAR_BUTTON_CLASS}
            >
              <UserCog className="w-4 h-4" />
              การลา/เปลี่ยนกะ
            </button>

            <HintTooltip
              tip={
                syncWeekLabel
                  ? `ส่งสัปดาห์ ${syncWeekLabel} ไป Google Sheet (กดปุ่มเท่านั้น ไม่ซิงค์อัตโนมัติ)`
                  : 'ส่งสัปดาห์ที่กำลังดูไป Google Sheet (กดปุ่มเท่านั้น ไม่ซิงค์อัตโนมัติ)'
              }
            >
              <button
                onClick={onSyncGoogleSheet}
                disabled={isReadOnly || isSyncingGoogleSheet}
                className={TOOLBAR_BUTTON_CLASS}
              >
                <RefreshCw
                  className={cn('w-4 h-4', isSyncingGoogleSheet && 'animate-spin')}
                  strokeWidth={1.5}
                />
                {isSyncingGoogleSheet ? 'กำลังซิงค์…' : 'ซิงค์ Google Sheet'}
              </button>
            </HintTooltip>

            <button
              onClick={onShowAddEmployeeModal}
              disabled={isReadOnly}
              className={TOOLBAR_BUTTON_CLASS}
            >
              <Plus className="w-4 h-4" />
              เพิ่มพนักงาน
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
