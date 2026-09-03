'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  format, 
  eachDayOfInterval, 
  parseISO,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  User, 
  Users, 
  Calendar as CalendarIcon,
  ImageDown,
} from '@/lib/icons';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { ExportProgressOverlay } from '@/components/ui/ExportProgressOverlay';
import { preloadCaptureLibraries } from '@/lib/capture-element-png';
import { fetchRosterData } from '@/app/actions/shift-actions';
import { ClickableDateRangePicker } from '@/components/ui/ClickableDateRangePicker';
import { RoundedSelect } from '@/components/ui/rounded-select';
import {
  getShiftColorClass,
  getShiftColorStyle,
  getShiftDisplayText,
} from '@/lib/shift-colors';
import { createShiftDateLookup, getShiftForProfileDate } from '@/lib/schedule/shift-lookups';
import { persistDashboardRosterRange, readDashboardRosterRangeFromStorage } from '@/lib/dashboard-date-range';
import {
  ROSTER_INDIVIDUAL_DAY_LABELS_FULL,
  ROSTER_INDIVIDUAL_DAY_LABELS_SHORT,
  mondayStartPadCount,
} from '@/lib/roster/week-start';
import {
  collectLeaveEntries,
  collectPublicHolidayWorkEntries,
  computeDashboardStaffStatCounts,
  createHolidayDateLookup,
  getPublicHolidayEntry,
  isLeaveShift,
} from '@/lib/dashboard/leave-details';
import type { HolidayLike, LeaveDetailEntry } from '@/lib/dashboard/leave-details';
import { preloadLeaveDetailDialog } from '@/lib/preload-leave-detail-dialog';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import { RosterExportStatSummary } from './RosterExportStatSummary';

const LeaveDetailDialog = dynamic(
  () =>
    import('./LeaveDetailDialog').then((m) => ({
      default: m.LeaveDetailDialog,
    })),
  { ssr: false },
);

const ROSTER_HOLIDAY_FRAME = 'ring-2 ring-inset ring-[#ffeeba]';
const ROSTER_INDIVIDUAL_DAY_FRAME = 'border border-foreground/15';
const ROSTER_INDIVIDUAL_PAD_FRAME = 'border border-border';

interface Profile {
  id: string;
  full_name: string;
}

interface Shift {
  id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  status: string;
  metadata?: {
    location?: string;
    remark?: string;
    notes?: string;
    is_management?: boolean;
  };
}

interface MonthlyRosterProps {
  initialProfiles?: Profile[];
  initialShifts?: Shift[];
  initialHolidays?: HolidayLike[];
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function MonthlyRoster({
  initialProfiles,
  initialShifts,
  initialHolidays,
  initialStartDate,
  initialEndDate,
}: MonthlyRosterProps) {
  const hasInitialData = Boolean(initialProfiles && initialProfiles.length > 0);
  const [startDate, setStartDate] = useState(initialStartDate || format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(initialEndDate || format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<'consolidated' | 'individual'>('consolidated');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    hasInitialData ? initialProfiles![0]?.id ?? null : null,
  );
  const [data, setData] = useState<{ profiles: Profile[]; shifts: Shift[] }>(
    hasInitialData
      ? { profiles: initialProfiles!, shifts: initialShifts! }
      : { profiles: [], shifts: [] },
  );
  const [holidays, setHolidays] = useState<HolidayLike[]>(initialHolidays ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [statDialog, setStatDialog] = useState<{
    title: string;
    entries: LeaveDetailEntry[];
    variant: 'leave' | 'holiday';
  } | null>(null);

  const daysInInterval = useMemo(() => {
    try {
      if (!startDate || !endDate) return [];
      return eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  const shiftDateLookup = useMemo(() => createShiftDateLookup(data.shifts), [data.shifts]);
  const holidayDateLookup = useMemo(() => createHolidayDateLookup(holidays), [holidays]);

  const selectedStaffExportSummary = useMemo(() => {
    if (!selectedStaffId) {
      return {
        workDays: 0,
        leaveDays: 0,
        publicHolidays: 0,
        leaveEntries: [] as LeaveDetailEntry[],
        holidayWorkEntries: [] as LeaveDetailEntry[],
      };
    }

    const statCounts = computeDashboardStaffStatCounts(
      data.shifts,
      selectedStaffId,
      holidays,
      { startDate, endDate },
    );

    return {
      ...statCounts,
      leaveEntries: collectLeaveEntries(data.shifts, selectedStaffId, { startDate, endDate }),
      holidayWorkEntries: collectPublicHolidayWorkEntries(
        data.shifts,
        selectedStaffId,
        holidays,
        { startDate, endDate },
      ),
    };
  }, [selectedStaffId, data.shifts, holidays, startDate, endDate]);

  const initialDataConsumedRef = useRef(false);
  const restoredRosterRangeRef = useRef(false);
  const selectedStaffIdRef = useRef(selectedStaffId);
  const hasInitialDataRef = useRef(hasInitialData);

  useEffect(() => {
    selectedStaffIdRef.current = selectedStaffId;
    hasInitialDataRef.current = hasInitialData;
  });

  useEffect(() => {
    if (restoredRosterRangeRef.current) return;
    restoredRosterRangeRef.current = true;

    const saved = readDashboardRosterRangeFromStorage();
    if (!saved) return;
    if (saved.start === startDate && saved.end === endDate) return;

    setStartDate(saved.start);
    setEndDate(saved.end);
    persistDashboardRosterRange(saved.start, saved.end);
  }, [startDate, endDate]);

  useEffect(() => {
    async function loadData() {
      if (!startDate || !endDate) return;

      const isBackgroundRefresh =
        hasInitialDataRef.current && !initialDataConsumedRef.current;
      if (isBackgroundRefresh) {
        initialDataConsumedRef.current = true;
      } else {
        setLoading(true);
      }

      const res = await fetchRosterData(startDate, endDate);
      if (res.success) {
        setData({ profiles: res.profiles, shifts: res.shifts });
        setHolidays(
          (res.holidays ?? []).filter(
            (holiday) => holiday.date >= startDate && holiday.date <= endDate,
          ),
        );
        if (res.profiles.length > 0 && !selectedStaffIdRef.current) {
          setSelectedStaffId(res.profiles[0].id);
        }
      }
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
    void loadData();
  }, [startDate, endDate]);

  useEffect(() => {
    return scheduleIdleWork(() => {
      preloadLeaveDetailDialog();
    }, { timeout: 2000 });
  }, []);

  const handleRangeChange = ({ start, end }: { start: string; end: string }) => {
    setStartDate(start);
    setEndDate(end);
    persistDashboardRosterRange(start, end);
  };

  const getShiftDisplay = (shift: Shift) => {
    const loc = shift.metadata?.location || '';
    return {
      text: getShiftDisplayText(loc, shift.status),
      color: getShiftColorClass(loc, shift.status),
      colorStyle: getShiftColorStyle(loc, shift.status),
      isLeave: isLeaveShift(shift),
    };
  };

  const openLeaveDialog = (profileId: string, profileName: string, date: string) => {
    preloadLeaveDetailDialog();
    const entries = collectLeaveEntries(data.shifts, profileId, { singleDate: date });
    if (entries.length === 0) return;
    setStatDialog({
      title: `รายละเอียดวันลา ${profileName}`,
      entries,
      variant: 'leave',
    });
  };

  const openHolidayDialog = (date: string) => {
    preloadLeaveDetailDialog();
    const entry = getPublicHolidayEntry(date, holidays);
    if (!entry) return;
    setStatDialog({
      title: 'รายละเอียดวันนักขัตฯ',
      entries: [entry],
      variant: 'holiday',
    });
  };

  const exportRosterImage = async () => {
    if (activeTab !== 'individual') return;

    const element = document.getElementById('blackandbrew-roster-export');
    if (!element) return;

    try {
      setIsExportingImage(true);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const { captureRosterAsPng, downloadPngBlob } = await import('@/lib/roster-export-capture');
      const blob = await captureRosterAsPng(element, {
        filter: (node: HTMLElement) => node?.id !== 'roster-action-buttons',
      });

      downloadPngBlob(
        blob,
        `Roster-Individual-${startDate}-${endDate}.png`,
      );
    } catch (err) {
      console.error('Failed to export roster image:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกตารางเวรเป็นรูปภาพค่ะ');
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div className="w-full bg-card rounded-[32px] p-4 md:p-8 border border-border bb-shadow-sm min-h-[700px] antialiased">
      {/* Header Controls */}
      <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-black flex items-center justify-center rounded-2xl bb-shadow-md">
            <CalendarIcon className="w-6 h-6 text-[#fdfcf0]" />
          </div>
          <h2 className="text-2xl text-foreground font-normal tracking-tight">ตารางเวรและภาพรวมช่วงวันที่</h2>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-4 md:gap-6 w-full lg:w-auto">
          {activeTab === 'individual' && (
            <div id="roster-action-buttons" className="flex items-center shrink-0">
              <HintTooltip tip="บันทึกเป็นรูปภาพ">
                <button
                  type="button"
                  onClick={() => void exportRosterImage()}
                  onMouseEnter={preloadCaptureLibraries}
                  onFocus={preloadCaptureLibraries}
                  disabled={loading || isExportingImage}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="บันทึกเป็นรูปภาพ"
                >
                  <ImageDown className="w-5 h-5" strokeWidth={1.75} aria-hidden />
                </button>
              </HintTooltip>
            </div>
          )}

          <ClickableDateRangePicker
            startValue={startDate}
            endValue={endDate}
            onChange={handleRangeChange}
            containerClassName="w-full md:min-w-[280px]"
          />

          <div className="flex bg-muted rounded-[24px] p-1.5 gap-1.5">
            <button 
              onClick={() => setActiveTab('consolidated')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bb-transition duration-300 ${activeTab === 'consolidated' ? 'bg-card bb-shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:opacity-100 opacity-60'}`}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-normal">รวมพนักงาน</span>
            </button>
            <button 
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bb-transition duration-300 ${activeTab === 'individual' ? 'bg-card bb-shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:opacity-100 opacity-60'}`}
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-normal">รายบุคคล</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[500px] gap-4">
          <div className="w-12 h-12 border-4 border-border border-t-foreground rounded-full animate-spin" />
          <p className="text-foreground font-normal animate-pulse">บรูกำลังจัดแจงข้อมูลเวรให้สักครู่นะคะ...</p>
        </div>
      ) : (
        <div className="bg-card rounded-[32px] overflow-hidden border border-border shadow-xl shadow-black/5">
          {activeTab === 'consolidated' ? (
            <div className="w-full overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y">
              <table className="w-max min-w-full border-collapse">
                <thead>
                  <tr className="bg-card">
                    <th className="sticky left-0 z-30 bg-card px-3 py-3 text-left border-b border-r border-border text-foreground font-normal whitespace-nowrap w-max shadow-sm bb-sticky-scroll-cell">
                      พนักงาน
                    </th>
                    {daysInInterval.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const isHoliday = holidayDateLookup.has(dateKey);
                      return (
                        <th
                          key={day.toISOString()}
                          className={`p-3 text-center border-b border-r border-border text-foreground font-normal min-w-[6.5rem] whitespace-nowrap ${isHoliday ? `${ROSTER_HOLIDAY_FRAME} touch-manipulation cursor-pointer` : ''}`}
                          onClick={isHoliday ? () => openHolidayDialog(dateKey) : undefined}
                          onKeyDown={
                            isHoliday
                              ? (event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openHolidayDialog(dateKey);
                                  }
                                }
                              : undefined
                          }
                          tabIndex={isHoliday ? 0 : undefined}
                          aria-label={isHoliday ? `ดูรายละเอียดวันนักขัตฯ ${dateKey}` : undefined}
                        >
                          <div className="text-[11px] text-foreground font-normal uppercase mb-1 opacity-80">{format(day, 'EEE', { locale: th })}</div>
                          <div className="text-lg leading-none">{format(day, 'd')}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.profiles.map((profile) => (
                    <tr key={profile.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-card px-3 py-3 align-middle border-r border-b border-border text-foreground font-normal text-sm group-hover:bg-muted/30 transition-colors whitespace-nowrap w-max shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] bb-sticky-scroll-cell">
                        {profile.full_name}
                      </td>
                      {daysInInterval.map((day) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const shift = getShiftForProfileDate(shiftDateLookup, profile.id, dateKey);
                        const display = shift ? getShiftDisplay(shift) : null;
                        return (
                          <td
                            key={day.toISOString()}
                            className="h-[4.25rem] min-w-[6.5rem] border-r border-b border-border p-1.5 align-middle"
                          >
                            {display?.isLeave ? (
                              <button
                                type="button"
                                onClick={() => openLeaveDialog(profile.id, profile.full_name, dateKey)}
                                className={`flex h-full min-h-[3rem] w-full items-center justify-center rounded-xl border px-2 py-1 text-center text-[12px] font-normal whitespace-nowrap shadow-sm touch-manipulation ${display.color}`}
                                style={display.colorStyle}
                                aria-label={`ดูรายละเอียดวันลา ${profile.full_name} ${dateKey}`}
                              >
                                {display.text}
                              </button>
                            ) : display ? (
                              <div
                                className={`flex h-full min-h-[3rem] w-full items-center justify-center rounded-xl border px-2 py-1 text-center text-[12px] font-normal whitespace-nowrap shadow-sm ${display.color}`}
                                style={display.colorStyle}
                              >
                                {display.text}
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div id="blackandbrew-roster-export" className="bg-card p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 p-6 bg-card rounded-3xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-xl"><User className="w-5 h-5 text-[#fdfcf0]" /></div>
                  <span className="text-foreground text-lg font-normal">พนักงาน:</span>
                </div>
                <RoundedSelect
                  value={selectedStaffId || ''}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-fit"
                  wrapperClassName="w-fit"
                >
                  {data.profiles.map(p => <option key={p.id} value={p.id} className="text-foreground">{p.full_name}</option>)}
                </RoundedSelect>
              </div>

              <div className="bb-roster-export-grid grid grid-cols-7 gap-1 md:gap-2">
                {ROSTER_INDIVIDUAL_DAY_LABELS_SHORT.map((day, idx) => (
                  <div key={day} className="py-2 px-1 text-center text-foreground text-[11px] md:text-[12px] font-normal uppercase tracking-wider">
                    <span className="md:hidden">{day}</span>
                    <span className="hidden md:inline">{ROSTER_INDIVIDUAL_DAY_LABELS_FULL[idx]}</span>
                  </div>
                ))}
                {daysInInterval.length > 0 && Array.from({ length: mondayStartPadCount(daysInInterval[0]) }).map((_, i) => (
                  <div key={`empty-${i}`} className={`bg-card rounded-xl sm:rounded-3xl h-20 sm:h-28 md:h-36 ${ROSTER_INDIVIDUAL_PAD_FRAME}`} />
                ))}
                {daysInInterval.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const shift = selectedStaffId
                    ? getShiftForProfileDate(shiftDateLookup, selectedStaffId, dateKey)
                    : undefined;
                  const display = shift ? getShiftDisplay(shift) : null;
                  const selectedProfile = data.profiles.find((profile) => profile.id === selectedStaffId);
                  const isHoliday = holidayDateLookup.has(dateKey);
                  const dayFrameClass = isHoliday
                    ? ROSTER_HOLIDAY_FRAME
                    : ROSTER_INDIVIDUAL_DAY_FRAME;

                  if (isHoliday) {
                    return (
                      <div
                        key={day.toISOString()}
                        role="button"
                        tabIndex={0}
                        onClick={() => openHolidayDialog(dateKey)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openHolidayDialog(dateKey);
                          }
                        }}
                        className={`flex h-20 cursor-pointer flex-col justify-between rounded-xl bg-card p-1 text-left bb-transition hover:bg-muted/30 hover:shadow-lg sm:h-28 sm:rounded-[24px] sm:p-3 md:h-36 md:p-4 touch-manipulation ${dayFrameClass}`}
                        aria-label={`ดูรายละเอียดวันนักขัตฯ ${dateKey}`}
                      >
                        <span className="text-sm font-normal text-foreground sm:text-base md:text-lg">{format(day, 'd')}</span>
                        {shift && display && display.isLeave ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!selectedStaffId || !selectedProfile) return;
                              openLeaveDialog(selectedStaffId, selectedProfile.full_name, dateKey);
                            }}
                            className={`flex min-h-[24px] w-full items-center justify-center truncate rounded-lg border p-0.5 text-center text-[10px] font-normal leading-tight shadow-sm sm:min-h-[40px] sm:rounded-xl sm:p-2 sm:text-xs md:min-h-[50px] md:p-2.5 md:text-[13px] md:leading-relaxed ${display.color}`}
                            style={display.colorStyle}
                            aria-label={`ดูรายละเอียดวันลา ${dateKey}`}
                          >
                            {display.text}
                          </button>
                        ) : shift && display ? (
                          <div
                            className={`flex min-h-[24px] w-full items-center justify-center truncate rounded-lg border p-0.5 text-center text-[10px] font-normal leading-tight shadow-sm sm:min-h-[40px] sm:rounded-xl sm:p-2 sm:text-xs md:min-h-[50px] md:p-2.5 md:text-[13px] md:leading-relaxed ${display.color}`}
                            style={display.colorStyle}
                          >
                            {display.text}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex h-20 flex-col justify-between rounded-xl bg-card p-1 bb-transition hover:bg-muted/30 hover:shadow-lg sm:h-28 sm:rounded-[24px] sm:p-3 md:h-36 md:p-4 ${dayFrameClass}`}
                    >
                      <span className="text-sm font-normal text-foreground sm:text-base md:text-lg">{format(day, 'd')}</span>
                      {shift && display && (
                        display.isLeave ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedStaffId || !selectedProfile) return;
                              openLeaveDialog(selectedStaffId, selectedProfile.full_name, dateKey);
                            }}
                            className={`flex min-h-[24px] w-full items-center justify-center truncate rounded-lg border p-0.5 text-center text-[10px] font-normal leading-tight shadow-sm touch-manipulation sm:min-h-[40px] sm:rounded-xl sm:p-2 sm:text-xs md:min-h-[50px] md:p-2.5 md:text-[13px] md:leading-relaxed ${display.color}`}
                            style={display.colorStyle}
                            aria-label={`ดูรายละเอียดวันลา ${dateKey}`}
                          >
                            {display.text}
                          </button>
                        ) : (
                          <div
                            className={`flex min-h-[24px] w-full items-center justify-center truncate rounded-lg border p-0.5 text-center text-[10px] font-normal leading-tight shadow-sm sm:min-h-[40px] sm:rounded-xl sm:p-2 sm:text-xs md:min-h-[50px] md:p-2.5 md:text-[13px] md:leading-relaxed ${display.color}`}
                            style={display.colorStyle}
                          >
                            {display.text}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              <RosterExportStatSummary
                workDays={selectedStaffExportSummary.workDays}
                leaveDays={selectedStaffExportSummary.leaveDays}
                publicHolidays={selectedStaffExportSummary.publicHolidays}
                leaveEntries={selectedStaffExportSummary.leaveEntries}
                holidayWorkEntries={selectedStaffExportSummary.holidayWorkEntries}
              />
            </div>
          )}
        </div>
      )}

      <ExportProgressOverlay
        visible={isExportingImage}
        title="กำลังบันทึกรูปภาพ"
        subtitle="กำลังจัดตารางเวร..."
      />

      {statDialog ? (
        <LeaveDetailDialog
          open
          title={statDialog.title}
          entries={statDialog.entries}
          variant={statDialog.variant}
          onClose={() => setStatDialog(null)}
        />
      ) : null}
    </div>
  );
}