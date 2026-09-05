import { preloadCaptureLibraries } from '@/lib/capture-element-png';
import {
  Plus,
  Undo2,
  Redo2,
  UserCog,
  Calendar,
  Download,
  Settings,
  RefreshCw,
} from '@/lib/icons';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { cn } from '@/lib/utils';
import {
  SCHEDULE_TOOLBAR_HISTORY_BUTTON,
  ScheduleToolbarButton,
} from './schedule-ui-primitives';

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
  const canUndo = !isReadOnly && undoStackLength > 0;
  const canRedo = !isReadOnly && redoStackLength > 0;

  return (
    <header className="bb-schedule-toolbar shrink-0 border-b border-border bg-card/80 backdrop-blur-sm px-3 py-3 md:px-5 md:py-3">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <div className="flex items-start justify-end gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-background/60 p-0.5"
              role="group"
              aria-label="ประวัติการแก้ไข"
            >
              <HintTooltip tip="เลิกทำ">
                <button
                  onClick={onUndo}
                  disabled={isReadOnly || undoStackLength === 0}
                  className={cn(
                    SCHEDULE_TOOLBAR_HISTORY_BUTTON,
                    'border-0 bg-transparent shadow-none',
                    canUndo
                      ? 'hover:bg-muted/40 text-foreground cursor-pointer'
                      : 'text-foreground/30 cursor-not-allowed',
                  )}
                  aria-label="เลิกทำ"
                >
                  <Undo2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </HintTooltip>
              <span className="h-5 w-px bg-border/80" aria-hidden />
              <HintTooltip tip="ทำซ้ำ">
                <button
                  onClick={onRedo}
                  disabled={isReadOnly || redoStackLength === 0}
                  className={cn(
                    SCHEDULE_TOOLBAR_HISTORY_BUTTON,
                    'border-0 bg-transparent shadow-none',
                    canRedo
                      ? 'hover:bg-muted/40 text-foreground cursor-pointer'
                      : 'text-foreground/30 cursor-not-allowed',
                  )}
                  aria-label="ทำซ้ำ"
                >
                  <Redo2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </HintTooltip>
            </div>
            <ClickableDatePicker
              value={initialDateStr}
              onChange={onDateChange}
              containerClassName="w-fit h-11 scale-100 origin-right"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y whitespace-nowrap pb-0.5 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:whitespace-normal">
          <div className="flex items-center gap-2">
            <ScheduleToolbarButton
              onClick={onExportScheduleImage}
              onMouseEnter={preloadCaptureLibraries}
              onFocus={preloadCaptureLibraries}
              icon={<Download className="w-4 h-4" strokeWidth={1.5} />}
            >
              บันทึกรูปภาพ
            </ScheduleToolbarButton>

            <ScheduleToolbarButton
              onClick={onShowShiftSettings}
              icon={<Settings className="w-4 h-4" strokeWidth={1.5} />}
            >
              ตั้งค่า
            </ScheduleToolbarButton>
          </div>

          <span className="hidden h-6 w-px shrink-0 bg-border/80 md:block" aria-hidden />

          <div className="flex items-center gap-2">
            <ScheduleToolbarButton
              onClick={onShowRegularHolidayModal}
              disabled={isReadOnly}
              icon={<Calendar className="w-4 h-4" strokeWidth={1.5} />}
            >
              วันหยุดประจำ
            </ScheduleToolbarButton>

            <ScheduleToolbarButton
              onClick={onShowManagementModal}
              disabled={isReadOnly}
              icon={<UserCog className="w-4 h-4" strokeWidth={1.5} />}
            >
              การลา/เปลี่ยนกะ
            </ScheduleToolbarButton>

            <HintTooltip
              tip={
                syncWeekLabel
                  ? `ส่งสัปดาห์ ${syncWeekLabel} ไป Google Sheet (กดปุ่มเท่านั้น ไม่ซิงค์อัตโนมัติ)`
                  : 'ส่งสัปดาห์ที่กำลังดูไป Google Sheet (กดปุ่มเท่านั้น ไม่ซิงค์อัตโนมัติ)'
              }
            >
              <ScheduleToolbarButton
                onClick={onSyncGoogleSheet}
                disabled={isReadOnly || isSyncingGoogleSheet}
                icon={
                  <RefreshCw
                    className={cn('w-4 h-4', isSyncingGoogleSheet && 'animate-spin')}
                    strokeWidth={1.5}
                  />
                }
              >
                {isSyncingGoogleSheet ? 'กำลังซิงค์…' : 'ซิงค์ Google Sheet'}
              </ScheduleToolbarButton>
            </HintTooltip>

            <ScheduleToolbarButton
              onClick={onShowAddEmployeeModal}
              disabled={isReadOnly}
              icon={<Plus className="w-4 h-4" strokeWidth={1.5} />}
            >
              เพิ่มพนักงาน
            </ScheduleToolbarButton>
          </div>
        </div>
      </div>
    </header>
  );
}
