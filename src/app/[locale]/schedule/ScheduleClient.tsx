'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Plus, Trash2, UserCog, AlertTriangle, Loader2, ChevronDown, X, Calendar, CalendarDays, Pencil } from 'lucide-react';
import { startOfWeek, addDays, format, parseISO, isValid } from 'date-fns';

import { useRouter, useSearchParams } from 'next/navigation';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { FloatingAlert } from '@/components/ui/floating-alert';
import { ExportProgressOverlay } from '@/components/ui/ExportProgressOverlay';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { saveRegularHolidays } from '@/app/actions/holiday-actions';

import { deleteShift, revalidateAppPaths, updateStaffOrder, saveShift, deleteManagementHistoryRange, renameShiftLocations } from '@/app/actions/shift-actions';
import ShiftSettingsModal from '@/components/schedule/ShiftSettingsModal';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import {
  loadShiftTypesFromStorage,
  saveShiftTypesToStorage,
  collectShiftRenames,
  getFohCountValues,
  SHIFT_TYPES_UPDATED_EVENT,
  type ShiftTypeDisplay,
  type ShiftTypeEntry,
} from '@/lib/shift-type-config';
import {
  createShiftDateLookup,
  createShiftTypeLookup,
  getShiftForProfileDate,
  getShiftTypeForLocation,
  type ShiftDateLookup,
  type ShiftTypeLookup,
} from '@/lib/schedule/shift-lookups';
import { useScheduleUndo } from '@/hooks/useScheduleUndo';
import ScheduleToolbar from './ScheduleToolbar';
import type { Profile, Shift } from '@/types';
import { isSameThaiDay, formatToThai } from '@/lib/date-utils';
import { THAI_TIMEZONE } from '@/lib/timezone';
import {
  REGULAR_HOLIDAYS_STORAGE_KEY,
  normalizeRegularHolidayDays,
  type RegularHolidayMap,
} from '@/lib/regular-holidays';

import {
  DndContext,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useSafeDndSensors } from '@/lib/dnd-sensors';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';

// --- Constants Outside Component ---
const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const SCHEDULE_GRID_TEMPLATE = 'minmax(180px, max-content) repeat(7, minmax(104px, 1fr))';
const SCHEDULE_GRID_STYLE: React.CSSProperties = {
  gridTemplateColumns: SCHEDULE_GRID_TEMPLATE,
};

interface ColumnDef {
  id: string;
  label: string;
  width: string;
}

const defaultHistoryColumns: ColumnDef[] = [
  { id: 'employee_name', label: 'พนักงาน', width: '150px' },
  { id: 'date_range', label: 'วันที่', width: '200px' },
  { id: 'shift_type', label: 'ประเภท', width: '180px' },
  { id: 'remark', label: 'หมายเหตุ', width: '250px' },
  { id: 'actions', label: 'จัดการ', width: '100px' }
];

// ฟังก์ชันคำนวณตำแหน่ง Dropdown ไม่ให้ทะลุขอบจอ
function getDropdownPosition(
  anchorX: number,
  anchorY: number,
  menuWidth: number,
  menuHeight: number
) {
  const GAP = 12;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchorX;
  let top = anchorY;

  const spaceRight = vw - anchorX;
  const spaceBottom = vh - anchorY;

  // Flip Horizontal
  if (spaceRight < menuWidth + GAP) {
    left = anchorX - menuWidth;
  }

  // Flip Vertical
  if (spaceBottom < menuHeight + GAP) {
    top = anchorY - menuHeight;
  }

  // Clamp
  left = Math.max(
    GAP,
    Math.min(left, vw - menuWidth - GAP)
  );

  top = Math.max(
    GAP,
    Math.min(top, vh - menuHeight - GAP)
  );

  return { left, top };
}

function ColumnHeader({ col, onResize, onResizeEnd }: {
  col: ColumnDef;
  onResize: (id: string, width: number) => void;
  onResizeEnd: (id: string, width: number) => void;
}) {
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.pageX;

    const el = e.currentTarget.parentElement;
    startWidth.current = el ? el.offsetWidth : (parseInt(col.width) || 150);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = moveEvent.pageX - startX.current;
      const newWidth = Math.max(20, startWidth.current + delta);
      onResize(col.id, newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      isResizing.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const delta = upEvent.pageX - startX.current;
      const finalWidth = Math.max(20, startWidth.current + delta);
      onResizeEnd(col.id, finalWidth);
    };

    document.addEventListener('mousemove', handleMouseMove, { signal });
    document.addEventListener('mouseup', handleMouseUp, { signal });
    e.preventDefault();
  };

  const style = {
    width: col.width,
    minWidth: '20px',
  };

  return (
    <th
      style={style}
      className="p-3 text-[13px] font-normal text-muted-foreground border-b border-r border-border bg-card text-center relative group select-none overflow-hidden"
    >
      <div className="truncate w-full px-1">{col.label}</div>
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 px-0.5 cursor-col-resize hover:bg-black/10 transition-all z-20 group/resizer"
      >
        <div className="w-[1px] h-full bg-[#000000]/5 group-hover/resizer:bg-black/20 mx-auto" />
      </div>
    </th>
  );
}

function hasManagementIndicator(metadata?: Shift['metadata']): boolean {
  return Boolean(metadata?.is_management || metadata?.remark);
}

// --- Sub-component: SortableEmployeeRow ---
interface SortableEmployeeRowProps {
  id: string;
  profile: Profile;
  weekDays: string[];
  shiftDateLookup: ShiftDateLookup<Shift>;
  shiftTypeLookup: ShiftTypeLookup<ShiftTypeDisplay>;
  onCellClick: (employeeId: string, date: string, shift: Shift | undefined, x: number, y: number) => void;
  editingNameId: string | null;
  nameInput: string;
  setNameInput: (s: string) => void;
  onNameClick: (id: string, name: string) => void;
  onSaveName: (id: string) => void;
  onDeleteEmployee: (id: string) => void;
  isReadOnly?: boolean;
}

const SortableEmployeeRow = React.memo(({
  id, profile, weekDays, shiftDateLookup, shiftTypeLookup, onCellClick,
  editingNameId, nameInput, setNameInput, onNameClick, onSaveName, onDeleteEmployee,
  isReadOnly = false,
}: SortableEmployeeRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: dndTransition,
    isDragging
  } = useSortable({ id });

  const style: React.CSSProperties = {
    ...SCHEDULE_GRID_STYLE,
    transform: CSS.Translate.toString(transform),
    transition: dndTransition || 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 100 : 1,
    willChange: 'transform',
  };

  return (
    <motion.div
      ref={setNodeRef}
      layout
      layoutId={id}
      style={style}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        layout: { duration: 0.3 }
      }}
      className={cn(
        "bb-schedule-grid grid border-b border-border hover:bg-muted/30 transition-all duration-300 group relative bg-transparent",
        isDragging && "opacity-80 scale-[1.02] shadow-xl z-[100] bg-card ring-1 ring-border rounded-3xl cursor-grabbing"
      )}
    >
      <div className="p-2 border-r border-border flex items-center gap-2 bg-card sticky left-0 z-20 text-foreground font-normal bb-sticky-scroll-cell">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <div
              {...attributes}
              {...(isReadOnly ? {} : listeners)}
              className={`p-3 min-h-[44px] min-w-[44px] rounded-3xl transition-all touch-none flex items-center justify-center ${isReadOnly ? 'opacity-60 cursor-not-allowed text-foreground/20' : 'cursor-grab active:cursor-grabbing hover:bg-muted/30 text-muted-foreground hover:text-foreground'}`}
              aria-label="ลากเพื่อเปลี่ยนลำดับ"
            >
              <GripVertical className="w-5 h-5" />
            </div>
          </TooltipTrigger>
          <TooltipPrimitive.Portal>
            <TooltipContent side="right" align="center" sideOffset={8}>
              ลากเพื่อเปลี่ยนลำดับ
            </TooltipContent>
          </TooltipPrimitive.Portal>
        </Tooltip>

        <div className="flex-1 py-1">
          {editingNameId === id ? (
            <input
              autoFocus
              disabled={isReadOnly}
              className="w-full h-11 bg-card border border-blue-400 text-base font-normal text-foreground px-3 rounded-3xl outline-none disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => onSaveName(id)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveName(id)}
            />
          ) : (
            <span
              onClick={() => !isReadOnly && onNameClick(id, profile.full_name)}
              className={`bb-schedule-nowrap text-[16px] font-normal text-foreground whitespace-nowrap leading-[1.6] tracking-tight transition-colors block ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-text hover:text-blue-600'}`}
            >
              {profile.full_name}
            </span>
          )}
        </div>
        <HintTooltip tip="ลบพนักงานถาวร">
          <button
            onClick={() => onDeleteEmployee(id)}
            disabled={isReadOnly}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            aria-label="ลบพนักงานถาวร"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </HintTooltip>
      </div>

      {weekDays.map(date => {
        const shift = getShiftForProfileDate(shiftDateLookup, profile.id, date);
        const type = getShiftTypeForLocation(shiftTypeLookup, shift?.metadata?.location);
        return (
          <div
            key={date}
            onClick={(e) => !isReadOnly && onCellClick(profile.id, date, shift, e.clientX, e.clientY)}
            className={`p-1 border-r last:border-0 border-border min-h-[52px] group/cell relative ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            title={shift?.metadata?.remark || (shift?.metadata?.is_management ? 'ลา / เปลี่ยนกะ' : '')}
          >
            {shift && (shift.status && shift.metadata?.location) ? (
              <div className="relative h-full w-full">
                <div
                  className={`bb-schedule-nowrap h-full w-full rounded-lg border px-2 py-1.5 flex justify-center items-center text-center whitespace-nowrap transition-all duration-200 group-hover/cell:scale-[0.97] group-hover/cell:shadow-md shadow-sm ${type?.className || 'bb-pastel-surface bg-card border-border text-[#000000]'}`}
                  style={type?.style}
                >
                  <span className="bb-schedule-nowrap text-[14.5px] font-normal leading-none tracking-tight whitespace-nowrap">{type?.label || shift.metadata?.location}</span>
                </div>
                {hasManagementIndicator(shift.metadata) && (
                  <div
                    className="pointer-events-none absolute top-2.5 right-2.5 z-10 h-1.5 w-1.5 rounded-full bg-blue-400/60"
                    aria-hidden
                  />
                )}
              </div>
            ) : (
              <div className="h-full w-full rounded-lg border border-transparent transition-all duration-200 group-hover/cell:bg-gray-100/50" />
            )}
          </div>
        );
      })}
    </motion.div>
  );
});

SortableEmployeeRow.displayName = 'SortableEmployeeRow';

type ScheduleHoliday = { id: string; date: string; name: string };

type ShiftWithJoinedProfile = Shift & {
  profiles?: Profile | Profile[] | null;
  profile_id?: string;
};

interface ManagementHistoryItem {
  id: string;
  employee_id: string;
  employee_name: string;
  location?: string;
  remark?: string;
  startDate: string;
  endDate: string;
  color: string;
  colorStyle?: React.CSSProperties;
  metadata: Shift['metadata'];
}

interface ScheduleClientProps {
  initialProfiles: Profile[];
  initialShifts: Shift[];
  initialHolidays: { id: string; date: string; name: string }[];
  initialRegularHolidays: RegularHolidayMap;
  initialDateStr: string;
  locale: string;
}

export default function ScheduleClient({
  initialProfiles,
  initialShifts,
  initialHolidays,
  initialRegularHolidays,
  initialDateStr,
  locale
}: ScheduleClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReadOnly = useReadOnly();

  const blockIfReadOnly = useCallback(() => {
    if (isReadOnly) {
      alert(READ_ONLY_DENY_MSG);
      return true;
    }
    return false;
  }, [isReadOnly]);

  const [currentDate, setCurrentDate] = useState(new Date(initialDateStr));
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [holidays, setHolidays] = useState<ScheduleHoliday[]>(initialHolidays);
  const [orderedProfileIds, setOrderedProfileIds] = useState<string[]>(initialProfiles.map(p => p.id));
  const [loading, setLoading] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [shiftTypes, setShiftTypes] = useState<ShiftTypeDisplay[]>(() => loadShiftTypesFromStorage());
  const [showShiftSettingsModal, setShowShiftSettingsModal] = useState(false);
  const [shiftSettingsSaving, setShiftSettingsSaving] = useState(false);
  const shiftTypesRef = useRef<ShiftTypeEntry[]>(shiftTypes);

  useEffect(() => {
    shiftTypesRef.current = shiftTypes;
  }, [shiftTypes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client mount gate and shift-type storage hydration
    setMounted(true);
    setShiftTypes(loadShiftTypesFromStorage());

    const onUpdated = () => setShiftTypes(loadShiftTypesFromStorage());
    window.addEventListener(SHIFT_TYPES_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(SHIFT_TYPES_UPDATED_EVENT, onUpdated);
  }, []);

  const [showRegularHolidayModal, setShowRegularHolidayModal] = useState(false);

  useEffect(() => {
    if (searchParams?.get('showRegularHolidays') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- open modal from URL search param on navigation
      setShowRegularHolidayModal(true);
    }
  }, [searchParams]);

  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string; shift?: Shift; x: number; y: number } | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<string | null>(null);
  const [holidayInput, setHolidayInput] = useState('');

  const [mgmtColumns, setMgmtColumns] = useState<ColumnDef[]>(defaultHistoryColumns);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // States สำหรับ Portal ตำแหน่ง Dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 0 });

  // อัปเดตตำแหน่งเมื่อ Scroll หรือ Resize
  useEffect(() => {
    if (!selectedCell) return;

    const updatePosition = () => {
      const menuHeight = dropdownRef.current?.offsetHeight || 300;
      const menuWidth = dropdownRef.current?.offsetWidth || 192; // 192px = w-48

      setDropdownPosition(
        getDropdownPosition(
          selectedCell.x,
          selectedCell.y,
          menuWidth,
          menuHeight
        )
      );
    };

    // Calculate immediately
    updatePosition();

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true); // true for capturing phase to catch div scrolls

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [selectedCell]);


  useEffect(() => {
    try {
      const saved = localStorage.getItem('blackandbrew-shift-history-col-widths');
      if (saved) {
        const widths: Record<string, string> = JSON.parse(saved);
        if (widths && typeof widths === 'object' && !Array.isArray(widths)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved column widths from localStorage on mount
          setMgmtColumns(prev => prev.map(col => {
            const w = Number(widths[col.id]);
            if (!isNaN(w) && w > 0 && w < 2000) {
              return { ...col, width: `${w}px` };
            }
            return col;
          }));
        }
      }
    } catch (e) {
      console.error('Failed to parse saved history column widths:', e);
      localStorage.removeItem('blackandbrew-shift-history-col-widths');
    }
  }, []);

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [originalHistoryRange, setOriginalHistoryRange] = useState<{
    employeeId: string;
    start: string;
    end: string;
  } | null>(null);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [managementForm, setManagementForm] = useState({
    employeeId: '',
    shiftType: '6:30',
    startDate: '',
    endDate: '',
    remark: ''
  });

  const [mgmtHistory, setMgmtHistory] = useState<ManagementHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState({ start: '', end: '' });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveShiftSettings = useCallback(async (entries: ShiftTypeEntry[]) => {
    if (blockIfReadOnly()) return;

    setShiftSettingsSaving(true);
    try {
      const renames = collectShiftRenames(shiftTypesRef.current, entries);

      if (renames.length > 0) {
        const result = await renameShiftLocations(renames);
        if (!result.success) {
          alert(result.error || 'ไม่สามารถอัปเดตชื่อกะในฐานข้อมูลได้');
          return;
        }

        if (result.updated && result.updated > 0) {
          setShifts((prev) =>
            prev.map((s) => {
              const loc = s.metadata?.location;
              const rename = renames.find((r) => r.oldValue === loc);
              if (!rename) return s;
              return {
                ...s,
                metadata: { ...s.metadata, location: rename.newValue },
              };
            })
          );
        }
      }

      const saved = saveShiftTypesToStorage(entries);
      setShiftTypes(saved);
      setShowShiftSettingsModal(false);
    } catch (err) {
      console.error('Failed to save shift settings:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    } finally {
      setShiftSettingsSaving(false);
    }
  }, [blockIfReadOnly]);

  const [regularHolidays, setRegularHolidays] = useState<RegularHolidayMap>(initialRegularHolidays);
  const [holidayFormEmployee, setHolidayFormEmployee] = useState<string>('');
  const [holidayFormDays, setHolidayFormDays] = useState<number[]>([]);
  const [toastAlert, setToastAlert] = useState<{message: string, x: number, y: number} | null>(null);
  const [holidaySaveSuccess, setHolidaySaveSuccess] = useState(false);
  const regularHolidayStorageReadyRef = useRef(false);
  const regularHolidayMigrationInFlightRef = useRef(false);
  const hasServerRegularHolidayData = useMemo(
    () => Object.keys(initialRegularHolidays).length > 0,
    [initialRegularHolidays]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REGULAR_HOLIDAYS_STORAGE_KEY);
      if (!saved) {
        regularHolidayStorageReadyRef.current = true;
        return;
      }

      const parsed = JSON.parse(saved) as RegularHolidayMap;
      if (!hasServerRegularHolidayData && parsed && typeof parsed === 'object') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate regular holidays from localStorage when server has none
        setRegularHolidays(parsed);
      }
    } catch (error) {
      console.error('Failed to load cached regular holidays:', error);
    } finally {
      regularHolidayStorageReadyRef.current = true;
    }
  }, [hasServerRegularHolidayData]);

  useEffect(() => {
    if (hasServerRegularHolidayData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server-provided regular holidays when props update
      setRegularHolidays(initialRegularHolidays);
    }
  }, [hasServerRegularHolidayData, initialRegularHolidays]);

  useEffect(() => {
    if (!regularHolidayStorageReadyRef.current) return;
    localStorage.setItem(REGULAR_HOLIDAYS_STORAGE_KEY, JSON.stringify(regularHolidays));
  }, [regularHolidays]);

  useEffect(() => {
    if (hasServerRegularHolidayData || regularHolidayMigrationInFlightRef.current || profiles.length === 0) {
      return;
    }

    const saved = localStorage.getItem(REGULAR_HOLIDAYS_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as RegularHolidayMap;
      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      const validProfileIds = new Set(profiles.map((profile) => profile.id));
      const migratableEntries = Object.entries(parsed)
        .map(([profileId, days]) => [profileId, normalizeRegularHolidayDays(days || [])] as const)
        .filter(([profileId, days]) => validProfileIds.has(profileId) && days.length > 0);

      if (migratableEntries.length === 0) {
        return;
      }

      regularHolidayMigrationInFlightRef.current = true;
      let cancelled = false;

      const migrateCachedRegularHolidays = async () => {
        setLoading(true);

        try {
          for (const [profileId, days] of migratableEntries) {
            const result = await saveRegularHolidays(profileId, days);
            if (!result.success) {
              throw new Error(result.error || `Failed to migrate regular holidays for ${profileId}`);
            }
          }

          if (cancelled) return;

          setRegularHolidays(
            migratableEntries.reduce<RegularHolidayMap>((acc, [profileId, days]) => {
              acc[profileId] = days;
              return acc;
            }, {})
          );
          router.refresh();
        } catch (error) {
          console.error('Failed to migrate cached regular holidays:', error);
          regularHolidayMigrationInFlightRef.current = false;
          alert('เกิดข้อผิดพลาดในการย้ายข้อมูลวันหยุดประจำขึ้น Supabase ข้อมูลในเครื่องยังอยู่ค่ะ');
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      void migrateCachedRegularHolidays();

      return () => {
        cancelled = true;
      };
    } catch (error) {
      console.error('Failed to parse cached regular holidays for migration:', error);
    }
  }, [hasServerRegularHolidayData, profiles, router]);

  const handleSaveRegularHolidays = async () => {
    if (blockIfReadOnly()) return;
    if (!holidayFormEmployee) return;

    const normalizedDays = normalizeRegularHolidayDays(holidayFormDays);
    const nextRegularHolidays = { ...regularHolidays };

    if (normalizedDays.length > 0) {
      nextRegularHolidays[holidayFormEmployee] = normalizedDays;
    } else {
      delete nextRegularHolidays[holidayFormEmployee];
    }

    setLoading(true);

    try {
      const result = await saveRegularHolidays(holidayFormEmployee, normalizedDays);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save regular holidays');
      }

      setRegularHolidays(nextRegularHolidays);
      setHolidayFormDays(normalizedDays);
      setHolidaySaveSuccess(true);
      setTimeout(() => setHolidaySaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save regular holidays:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกวันหยุดประจำ ข้อมูลเดิมยังคงอยู่ค่ะ');
    } finally {
      setLoading(false);
    }
  };

  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date(currentDate), { weekStartsOn: 1 });
    return [...Array(7)].map((_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
  }, [currentDate]);

  const profileById = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const activeProfileIds = useMemo(() => new Set(orderedProfileIds), [orderedProfileIds]);
  const holidayByDate = useMemo(() => new Map(holidays.map((holiday) => [holiday.date, holiday])), [holidays]);
  const shiftDateLookup = useMemo(() => createShiftDateLookup(shifts), [shifts]);
  const shiftTypeLookup = useMemo(() => createShiftTypeLookup(shiftTypes), [shiftTypes]);
  const validShiftValues = useMemo(() => new Set(getFohCountValues(shiftTypes)), [shiftTypes]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync server-fetched schedule data when parent revalidates */
    if (initialProfiles && initialProfiles.length > 0) {
      setProfiles(initialProfiles);
      setOrderedProfileIds(initialProfiles.map(p => p.id));
    }
    if (initialShifts) {
      setShifts(initialShifts);
    }
    if (initialHolidays) {
      setHolidays(initialHolidays);
    }
    if (initialDateStr) {
      setCurrentDate(new Date(initialDateStr));
    }
    if (hasServerRegularHolidayData) {
      setRegularHolidays(initialRegularHolidays);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [hasServerRegularHolidayData, initialProfiles, initialShifts, initialHolidays, initialRegularHolidays, initialDateStr]);

  const { undoStack, redoStack, pushToHistory, undo, redo } = useScheduleUndo({
    profiles,
    orderedProfileIds,
    shifts,
    weekDays,
    setProfiles,
    setOrderedProfileIds,
    setShifts,
    blockIfReadOnly,
  });

  const handleClearAll = async () => {
    if (blockIfReadOnly()) return;
    pushToHistory(profiles, orderedProfileIds, shifts);
    try {
      await supabase.from('shifts').delete().gte('start_time', weekDays[0] + 'T00:00:00').lte('start_time', weekDays[6] + 'T23:59:59');
      setShowClearConfirm(false);
      await revalidateAppPaths();
    } catch {
      alert('ไม่สามารถลบข้อมูลได้ โปรดลองอีกครั้ง');
    }
  };

  const fetchMgmtHistory = useCallback(async () => {
    try {
      let query = supabase.from('shifts')
        .select(`id, employee_id, status, start_time, end_time, metadata, profiles(full_name)`)
        .eq('metadata->is_management', true)
        .order('start_time', { ascending: false });

      if (historyFilter.start) query = query.gte('start_time', historyFilter.start + 'T00:00:00');
      if (historyFilter.end) query = query.lte('start_time', historyFilter.end + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;

      const grouped: ManagementHistoryItem[] = [];
      const sorted = [...(data || [])].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      sorted.forEach(shift => {
        const shiftRow = shift as ShiftWithJoinedProfile;
        const prev = grouped.find(g =>
          g.employee_id === shift.employee_id &&
          g.metadata?.location === shift.metadata?.location &&
          g.metadata?.remark === shift.metadata?.remark &&
          format(addDays(new Date(g.endDate), 1), 'yyyy-MM-dd') === format(new Date(shift.start_time), 'yyyy-MM-dd')
        );

        if (prev) {
          prev.endDate = shift.start_time;
        } else {
          grouped.push({
            id: shift.id,
            employee_id: shift.employee_id,
            employee_name: (() => {
              const profiles = shiftRow.profiles;
              if (Array.isArray(profiles)) return profiles[0]?.full_name || 'Unknown';
              return profiles?.full_name || 'Unknown';
            })(),
            location: shift.metadata?.location,
            remark: shift.metadata?.remark,
            startDate: shift.start_time,
            endDate: shift.start_time,
            color: shiftTypes.find(t => t.value === shift.metadata?.location)?.className || 'bb-pastel-surface bg-card border-border text-[#000000]',
            colorStyle: shiftTypes.find(t => t.value === shift.metadata?.location)?.style,
            metadata: { ...shift.metadata }
          });
        }
      });

      setMgmtHistory(grouped.reverse());
    } catch { }
  }, [historyFilter, shiftTypes]);

  useEffect(() => {
    if (showManagementModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- load management history when modal opens
      void fetchMgmtHistory();
    }
  }, [showManagementModal, fetchMgmtHistory]);

  const handleColumnResize = useCallback((id: string, width: number) => {
    setMgmtColumns(prev => prev.map(col => col.id === id ? { ...col, width: `${width}px` } : col));
  }, []);

  const handleColumnResizeEnd = useCallback((id: string, width: number) => {
    setMgmtColumns(prev => {
      const nextCols = prev.map(col => col.id === id ? { ...col, width: `${width}px` } : col);
      const widths = nextCols.reduce<Record<string, string>>((acc, c) => {
        const px = parseInt(c.width);
        if (!isNaN(px)) acc[c.id] = String(px);
        return acc;
      }, {});
      localStorage.setItem('blackandbrew-shift-history-col-widths', JSON.stringify(widths));
      return nextCols;
    });
  }, []);

  const handleEditHistory = (item: ManagementHistoryItem) => {
    setEditingHistoryId(item.id);
    setOriginalHistoryRange({
      employeeId: item.employee_id,
      start: item.startDate,
      end: item.endDate
    });
    setManagementForm({
      employeeId: item.employee_id,
      shiftType: item.location,
      startDate: item.startDate.split('T')[0],
      endDate: item.endDate.split('T')[0],
      remark: item.remark || ''
    });
    
    const formContainer = document.querySelector('.management-form-container');
    if (formContainer) {
      formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cancelEditHistory = () => {
    setEditingHistoryId(null);
    setOriginalHistoryRange(null);
    setManagementForm({ employeeId: '', shiftType: '6:30', startDate: '', endDate: '', remark: '' });
  };

  const handleDeleteHistory = async (historyItem: ManagementHistoryItem) => {
    if (blockIfReadOnly()) return;
    if (!window.confirm(`คุณต้องการลบประวัติการจัดการของ ${historyItem.employee_name} วันที่ ${format(new Date(historyItem.startDate), 'dd/MM/yyyy')} ใช่หรือไม่?\n(การกระทำนี้จะลบกะการทำงานในช่วงนี้ออกด้วย)`)) {
      return;
    }

    setConfirmDeleteId(historyItem.id);
    const previousHistory = [...mgmtHistory];
    setMgmtHistory(prev => prev.filter(h => h.id !== historyItem.id));

    try {
      const { success, error } = await deleteManagementHistoryRange(
        historyItem.employee_id,
        historyItem.startDate,
        historyItem.endDate
      );

      if (!success) throw new Error(error || 'Failed to delete history');

      const { data: freshShifts } = await supabase
        .from('shifts')
        .select('id, employee_id, status, start_time, end_time, metadata')
        .gte('start_time', weekDays[0] + 'T00:00:00')
        .lte('start_time', weekDays[6] + 'T23:59:59');
      if (freshShifts) setShifts(freshShifts);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      console.error('Failed to delete history:', err);
      setMgmtHistory(previousHistory);
      alert('ไม่สามารถลบประวัติได้: ' + message);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleSaveManagement = async () => {
    if (blockIfReadOnly()) return;
    if (!managementForm.employeeId || !managementForm.startDate || !managementForm.endDate) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน (พนักงาน, วันเริ่มต้น, วันสิ้นสุด)');
      return;
    }

    setLoading(true);
    pushToHistory(profiles, orderedProfileIds, shifts);

    try {
      if (editingHistoryId && originalHistoryRange) {
        const { success: delSuccess } = await deleteManagementHistoryRange(
          originalHistoryRange.employeeId,
          originalHistoryRange.start,
          originalHistoryRange.end
        );
        if (!delSuccess) throw new Error('Failed to clear original range');
      }

      const start = new Date(managementForm.startDate);
      const end = new Date(managementForm.endDate);
      const newShifts: Array<{
        employee_id: string;
        start_time: string;
        end_time: string;
        status: 'scheduled' | 'on_leave';
        metadata: { location: string; is_management: boolean; remark: string };
      }> = [];
      const datesToDelete: string[] = [];

      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        datesToDelete.push(dateStr + 'T00:00:00');
        const isLeave = managementForm.shiftType === 'ลา' || managementForm.shiftType === 'on_leave';

        newShifts.push({
          employee_id: managementForm.employeeId,
          start_time: dateStr + 'T00:00:00',
          end_time: dateStr + 'T23:59:59',
          status: isLeave ? 'on_leave' : 'scheduled',
          metadata: {
            location: managementForm.shiftType,
            is_management: true,
            remark: managementForm.remark
          }
        });
      }

      if (datesToDelete.length > 0) {
        const { error: delError } = await supabase.from('shifts')
          .delete()
          .eq('employee_id', managementForm.employeeId)
          .in('start_time', datesToDelete);
        if (delError) throw delError;
      }

      if (newShifts.length > 0) {
        const { data: insertedShifts, error: insError } = await supabase.from('shifts')
          .insert(newShifts)
          .select('id, employee_id, start_time, end_time, status, metadata');
        if (insError) throw insError;

        const affectedDates = new Set(datesToDelete.map((d) => d.split('T')[0]));
        setShifts((prev) => {
          const filtered = prev.filter((s) => {
            const sDate = s.start_time.split('T')[0];
            const empIdMatch = s.employee_id === managementForm.employeeId || (s as ShiftWithJoinedProfile).profile_id === managementForm.employeeId;
            return !(empIdMatch && affectedDates.has(sDate));
          });
          return [...filtered, ...(insertedShifts || newShifts)];
        });
      }

      setSaveSuccess(true);
      fetchMgmtHistory();
      setTimeout(() => setSaveSuccess(false), 3000);
      setEditingHistoryId(null);
      setOriginalHistoryRange(null);
      setManagementForm({ employeeId: '', shiftType: '6:30', startDate: '', endDate: '', remark: '' });
      await revalidateAppPaths();
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const sensors = useSafeDndSensors();

  const handleDragStart = (event: DragStartEvent) => {
    if (isReadOnly) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (isReadOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const rollbackOrder = [...orderedProfileIds];
    const oldIndex = orderedProfileIds.indexOf(active.id as string);
    const newIndex = orderedProfileIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(orderedProfileIds, oldIndex, newIndex);
      setOrderedProfileIds(newOrder);

      try {
        const result = await updateStaffOrder(newOrder);
        if (!result.success) throw new Error(result.error);
      } catch (error) {
        console.error('World-Class DND Rollback (Schedule):', error);
        setOrderedProfileIds(rollbackOrder);
        alert('ไม่สามารถจัดลำดับได้ เนื่องจากปัญหาการเชื่อมต่อหรือสิทธิ์การเข้าถึง');
      }
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (blockIfReadOnly()) return;
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้ถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้ และจะลบกะงานทั้งหมดที่เกี่ยวข้องด้วย')) return;

    setLoading(true);
    pushToHistory(profiles, orderedProfileIds, shifts); 
    try {
      await supabase.from('shifts').delete().eq('employee_id', employeeId);
      const { error } = await supabase.from('profiles').delete().eq('id', employeeId);
      if (error) throw error;

      setProfiles(prev => prev.filter(p => p.id !== employeeId));
      setOrderedProfileIds(prev => prev.filter(id => id !== employeeId));
      setShifts(prev => prev.filter(s => s.employee_id !== employeeId));
      revalidateAppPaths();
    } catch (error) {
      console.error('Failed to delete employee:', error);
      alert('เกิดข้อผิดพลาดในการลบพนักงาน');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (blockIfReadOnly()) return;
    if (!newEmployeeName.trim()) return;

    setLoading(true);
    try {
      const nextOrder = profiles.length;
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ full_name: newEmployeeName.trim(), display_order: nextOrder }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const newProfile = data as Profile;
        setProfiles(prev => [...prev, newProfile]);
        setOrderedProfileIds(prev => [...prev, newProfile.id]);
        setNewEmployeeName('');
        setShowAddEmployeeModal(false);
        revalidateAppPaths();
      }
    } catch (error) {
      console.error('Failed to add employee:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มพนักงาน');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async (id: string) => {
    if (blockIfReadOnly()) return;
    if (!nameInput.trim()) return setEditingNameId(null);
    pushToHistory(profiles, orderedProfileIds, shifts);
    try {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, full_name: nameInput } : p));
      setEditingNameId(null);
      await supabase.from('profiles').update({ full_name: nameInput }).eq('id', id);
      revalidateAppPaths(); 
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึกชื่อ');
    }
  };

  const handleSave = async (type: string) => {
    if (blockIfReadOnly()) return;
    if (!selectedCell) return;
    const { employeeId, date } = selectedCell;
    setSelectedCell(null);

    const isLeave = type === 'on_leave' || type === 'ลา';

    const assignDay = new Date(date).getDay();
    if (!isLeave && regularHolidays[employeeId] && regularHolidays[employeeId].includes(assignDay)) {
      const empName = profileById.get(employeeId)?.full_name || 'พนักงาน';
      setToastAlert({
        message: `แจ้งเตือน: วันนี้เป็นวันหยุดประจำของ ${empName} ค่ะ`,
        x: selectedCell.x,
        y: selectedCell.y
      });
    }

    const payload = {
      employee_id: employeeId,
      start_time: date + 'T00:00:00',
      end_time: date + 'T23:59:59',
      status: (isLeave ? 'on_leave' : 'scheduled') as Shift['status'],
      metadata: { location: type }
    };

    const previousShifts = [...shifts];
    pushToHistory(profiles, orderedProfileIds, shifts);

    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticShift: Shift = {
      id: tempId,
      employee_id: employeeId,
      start_time: date + 'T00:00:00',
      end_time: date + 'T23:59:59',
      status: isLeave ? 'on_leave' : 'scheduled',
      metadata: { location: type }
    };

    setShifts(prev => {
      const filtered = prev.filter(s => {
        const sDate = s.start_time.split('T')[0];
        const empIdMatch = s.employee_id === employeeId || (s as ShiftWithJoinedProfile).profile_id === employeeId;
        return !(empIdMatch && sDate === date);
      });
      return [...filtered, optimisticShift];
    });

    try {
      const res = await saveShift(payload);
      if (!res.success) {
        console.error('[handleSave] Server action failed:', res.error);
        setShifts(previousShifts);
        return;
      }
      if (res.data?.id) {
        setShifts(prev => prev.map(s =>
          s.id === tempId ? { ...s, id: res.data!.id } : s
        ));
      }
    } catch (error) {
      console.error('[handleSave] Network Error:', error);
      setShifts(previousShifts);
    }
  };

  const handleClear = async () => {
    if (blockIfReadOnly()) return;
    if (!selectedCell) return;
    const latestShift = getShiftForProfileDate(shiftDateLookup, selectedCell.employeeId, selectedCell.date);

    if (!latestShift?.id) {
      setSelectedCell(null);
      return;
    }

    const shiftId = latestShift.id;
    const previousShifts = [...shifts];
    pushToHistory(profiles, orderedProfileIds, shifts);

    setShifts(prev => prev.filter(s => s.id !== shiftId));
    setSelectedCell(null);
    if (shiftId.startsWith('temp-')) return;

    try {
      const result = await deleteShift(shiftId);
      if (!result.success) {
        console.error('[handleClear] Server action failed:', result.error);
        setShifts(previousShifts);
        return;
      }
    } catch (error) {
      console.error('[handleClear] Network Error:', error);
      setShifts(previousShifts);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      router.push(`?week=${e.target.value}`);
    }
  };

  const handleSaveHoliday = async (date: string) => {
    if (blockIfReadOnly()) return;
    try {
      if (!holidayInput.trim()) {
        setHolidays(prev => prev.filter(h => h.date !== date));
        await supabase.from('holidays').delete().eq('date', date);
      } else {
        const existing = holidayByDate.get(date);
        if (existing) {
          setHolidays(prev => prev.map(h => h.date === date ? { ...h, name: holidayInput } : h));
          await supabase.from('holidays').update({ name: holidayInput }).eq('id', existing.id);
        } else {
          const { data } = await supabase.from('holidays').insert({ date, name: holidayInput }).select().single();
          if (data) setHolidays(prev => [...prev, data]);
        }
      }
      setEditingHoliday(null);
      setHolidayInput('');
      revalidateAppPaths(); 
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึกวันหยุดค่ะ');
    }
  };

  const exportScheduleImage = async () => {
    try {
      const element = document.getElementById('blackandbrew-schedule-table');
      if (!element) return;

      setIsExportingImage(true);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const { captureScheduleTableAsPng, downloadDataUrl } = await import('@/lib/schedule-export-capture');
      const dataUrl = await captureScheduleTableAsPng(element);

      downloadDataUrl(dataUrl, `Schedule-${new Date().toISOString().split('T')[0]}.png`);
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกตารางงานเป็นรูปภาพค่ะ');
    } finally {
      setIsExportingImage(false);
    }
  };

  const [todayStr, setTodayStr] = useState<string>(() => 
    formatToThai(new Date(), 'yyyy-MM-dd')
  );

  useEffect(() => {
    const updateAtMidnight = () => {
      const now = new Date();
      const today = formatToThai(now, 'yyyy-MM-dd');
      
      if (today !== todayStr) {
        setTodayStr(today);
      }

      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const nextMidnightThai = new Date(
        nextMidnight.toLocaleString('en-US', { timeZone: THAI_TIMEZONE })
      );
      const msUntilMidnight = nextMidnightThai.getTime() - now.getTime() + 100; 
      
      setTimeout(updateAtMidnight, msUntilMidnight);
    };

    const intervalId = setInterval(updateAtMidnight, 60000); 
    updateAtMidnight();
    
    return () => clearInterval(intervalId);
  }, [todayStr]);

  return (
    <div className="flex flex-col h-screen bg-transparent text-foreground overflow-hidden">
      <ScheduleToolbar
        isReadOnly={isReadOnly}
        undoStackLength={undoStack.length}
        redoStackLength={redoStack.length}
        onUndo={undo}
        onRedo={redo}
        initialDateStr={initialDateStr}
        onDateChange={handleDateChange}
        onShowRegularHolidayModal={() => setShowRegularHolidayModal(true)}
        onShowManagementModal={() => setShowManagementModal(true)}
        onShowClearConfirm={() => setShowClearConfirm(true)}
        onExportScheduleImage={exportScheduleImage}
        onShowAddEmployeeModal={() => setShowAddEmployeeModal(true)}
        onShowShiftSettings={() => setShowShiftSettingsModal(true)}
      />

      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col bg-transparent">
        <div className="flex-1 flex flex-col bg-card/80 backdrop-blur-sm bb-ios-scroll-host border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="flex-1 min-h-0 min-w-0 overflow-x-auto scrollbar-thin overflow-y-auto bb-smooth-scroll bb-smooth-scroll-chain-y bb-scroll-xy pb-6">
            <div id="blackandbrew-schedule-table" className="bb-schedule-export-surface min-w-[980px] bg-card h-fit flex flex-col">
              <div
                className="bb-schedule-grid grid border-b border-border dark:border-[#f5c6cb] bg-red-50/10 dark:bb-pastel-surface dark:bg-[#fdeaea] sticky top-0 z-[16]"
                style={SCHEDULE_GRID_STYLE}
              >
                <div className="p-2.5 border-r border-border dark:border-[#f5c6cb] flex items-center justify-center bg-card sticky left-0 z-20 font-normal md:static md:bg-red-50/20 dark:bb-pastel-surface dark:bg-[#fdeaea] bb-sticky-scroll-cell">
                  <span className="bb-schedule-nowrap text-[12px] text-[#991b1b] font-normal uppercase tracking-widest whitespace-nowrap">นักขัตฤกษ์</span>
                </div>
                {weekDays.map(date => {
                  const holiday = holidayByDate.get(date);
                  return (
                    <div
                      key={`holiday-${date}`}
                      onClick={() => { if (!isReadOnly) { setEditingHoliday(date); setHolidayInput(holiday?.name || ''); } }}
                      className={`p-1 border-r last:border-0 border-border dark:border-[#f5c6cb] flex items-center justify-center min-h-[38px] transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-red-50 dark:hover:bg-[#f5c6cb]/25'}`}
                    >
                      {editingHoliday === date ? (
                        <input
                          autoFocus
                          disabled={isReadOnly}
                          className="w-full h-full bg-card border border-red-200 dark:border-[#f5c6cb] text-[14px] text-[#7f1d1d] font-normal text-center rounded focus:outline-none ring-1 ring-red-400 dark:ring-[#f5c6cb] disabled:opacity-60 disabled:cursor-not-allowed dark:bb-pastel-surface dark:bg-white/90"
                          value={holidayInput}
                          onChange={(e) => setHolidayInput(e.target.value)}
                          onBlur={() => handleSaveHoliday(date)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveHoliday(date)}
                        />
                      ) : (
                        <span className="bb-schedule-nowrap text-[14px] font-normal text-[#7f1d1d] text-center leading-tight tracking-tight px-1 uppercase whitespace-nowrap">
                          {holiday?.name || ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                className="bb-schedule-grid grid bg-muted/40 border-b border-border shrink-0 sticky top-[38px] z-[15]"
                style={SCHEDULE_GRID_STYLE}
              >
                <div className="p-2.5 border-r border-border flex items-center justify-center bg-card sticky left-0 z-20 text-foreground font-normal bb-sticky-scroll-cell">
                  <span className="bb-schedule-nowrap text-[13px] text-foreground font-normal uppercase tracking-widest whitespace-nowrap">พนักงาน</span>
                </div>
                {weekDays.map((date) => {
                  const d = new Date(date);
                  const isToday = date === todayStr;
                  return (
                    <div key={date} className="p-1.5 flex flex-col items-center justify-center text-center border-r last:border-0 border-border transition-colors min-h-[50px] bg-transparent">
                      <div className="text-[12px] font-normal uppercase tracking-tighter mb-0 text-foreground">{dayLabels[d.getDay()]}</div>
                      <div className={`text-xl font-normal w-8 h-8 flex items-center justify-center mt-0.5 rounded-full ${isToday ? 'bg-[#ffda66] text-black' : 'text-foreground'}`}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {mounted ? (
                <DndContext
                  id="schedule-dnd"
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToWindowEdges]}
                >
                  <SortableContext items={orderedProfileIds} strategy={verticalListSortingStrategy}>
                    {orderedProfileIds.map(pid => {
                      const p = profileById.get(pid);
                      if (!p) return null;
                      return (
                        <SortableEmployeeRow
                          key={p.id}
                          id={p.id}
                          profile={p}
                          weekDays={weekDays}
                          shiftDateLookup={shiftDateLookup}
                          shiftTypeLookup={shiftTypeLookup}
                          onCellClick={(employeeId, date, shift, x, y) => setSelectedCell({ employeeId, date, shift, x, y })}
                          editingNameId={editingNameId}
                          nameInput={nameInput}
                          setNameInput={setNameInput}
                          onNameClick={(id, name) => { setEditingNameId(id); setNameInput(name); }}
                          onSaveName={handleSaveName}
                          onDeleteEmployee={handleDeleteEmployee}
                          isReadOnly={isReadOnly}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="opacity-50 pointer-events-none">
                  {orderedProfileIds.map(pid => {
                    const p = profileById.get(pid);
                    if (!p) return null;
                    return (
                      <SortableEmployeeRow
                        key={p.id}
                        id={p.id}
                        profile={p}
                        weekDays={weekDays}
                        shiftDateLookup={shiftDateLookup}
                        shiftTypeLookup={shiftTypeLookup}
                        onCellClick={() => { }}
                        editingNameId={null}
                        nameInput={""}
                        setNameInput={() => { }}
                        onNameClick={() => { }}
                        onSaveName={() => { }}
                        onDeleteEmployee={() => { }}
                        isReadOnly={isReadOnly}
                      />
                    );
                  })}
                </div>
              )}

              <div
                className="bb-schedule-grid grid border-t border-border bg-muted/50 sticky bottom-0 z-[15]"
                style={SCHEDULE_GRID_STYLE}
              >
                <div className="p-2 border-r border-border flex items-center justify-center bg-card/80 sticky left-0 z-20 bb-sticky-scroll-cell">
                </div>
                {weekDays.map(date => {
                  const fohCount = new Set(
                    shifts
                      .filter(s => {
                        const loc = s.metadata?.location?.trim();
                        const isSameDay = isSameThaiDay(s.start_time, date);
                        const isActiveEmployee = s.employee_id && activeProfileIds.has(s.employee_id);
                        return isSameDay && s.status !== 'on_leave' && isActiveEmployee && validShiftValues.has(loc || '');
                      })
                      .map(s => s.employee_id)
                  ).size;
                  const isToday = date === todayStr;
                  return (
                    <div
                      key={`foh-${date}`}
                      className={`p-1.5 border-r last:border-0 border-border flex items-center justify-center ${
                        isToday ? 'bg-amber-400/15 ring-1 ring-inset ring-amber-400/30' : ''
                      }`}
                    >
                      <span className={`text-[15px] font-normal tabular-nums ${
                        fohCount > 0 ? 'text-emerald-500' : 'text-muted-foreground'
                      }`}>{fohCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* สลับไปใช้งาน Portal และเชื่อม State ตำแหน่งที่คำนวณไว้ */}
      {selectedCell && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] overflow-hidden"
          onClick={() => setSelectedCell(null)}
        >
          <div
            ref={dropdownRef}
            className="absolute bg-card/95 backdrop-blur-md border border-border w-48 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2.5 border-b border-border bg-[#000000]/5">
              <h2 className="text-[13px] font-normal text-foreground truncate">
                {profileById.get(selectedCell.employeeId)?.full_name}
              </h2>
            </div>
            <div className="p-1.5 grid gap-1">
              {shiftTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleSave(type.value)}
                  disabled={isReadOnly}
                  className={`h-11 md:h-auto py-1.5 px-3 rounded-lg border text-base md:text-[12px] font-normal shadow-sm w-full text-left transition-all duration-200 hover:brightness-95 hover:shadow-md active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${type.className}`}
                  style={type.style}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {selectedCell.shift && (
              <div className="p-1.5 bg-card border-t border-border">
                <button
                  onClick={handleClear}
                  disabled={isReadOnly}
                  className="w-full h-11 md:h-auto py-1.5 rounded-lg bg-red-50 text-[#ff0000] text-base md:text-[11px] font-normal border border-red-100 hover:bg-[#ff0000] hover:text-[#ffffff] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.97]"
                >
                  Clear Entry
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <FadeModalScaffold
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        zIndex={60}
        overlayClassName="bg-[#000000]/20 backdrop-blur-sm"
        panelClassName="fixed bottom-0 left-0 right-0 rounded-t-[32px] w-full max-h-[85vh] overflow-y-auto bb-smooth-scroll bg-card shadow-2xl md:relative md:rounded-3xl md:max-w-sm md:max-h-none md:translate-y-0 p-6 max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-foreground text-center space-y-4"
        aria-label="ยืนยันการลบข้อมูล"
      >
            <HintTooltip tip="ปิด">
              <button onClick={() => setShowClearConfirm(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-full transition-colors z-10" aria-label="ปิด">
                <X className="w-5 h-5" />
              </button>
            </HintTooltip>
            <div className="w-12 h-1.5 bg-[#000000]/10 rounded-full mx-auto mb-6 md:hidden" />
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-normal text-foreground">ยืนยันการลบข้อมูล</h3>
            <p className="text-sm text-foreground/70">คุณแน่ใจหรือไม่ที่จะลบข้อมูลกะงาน<br />ของสัปดาห์นี้ทั้งหมด</p>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="h-11 md:h-auto py-2.5 rounded-xl bg-[#000000]/5 hover:bg-[#000000]/10 text-foreground text-base md:text-sm font-normal transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleClearAll}
                className="h-11 md:h-auto py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-[#ffffff] text-base md:text-sm font-normal transition-colors cursor-pointer"
              >
                ยืนยันการลบ
              </button>
            </div>
      </FadeModalScaffold>

      <ExportProgressOverlay
        visible={isExportingImage}
        title="กำลังบันทึกรูปภาพ"
        subtitle="กำลังจัดตำแหน่งตารางงาน..."
      />
      <ExportProgressOverlay
        visible={loading}
        title="กำลังดำเนินการ"
        subtitle="กรุณารอสักครู่..."
      />

      <ShiftSettingsModal
        open={showShiftSettingsModal}
        shiftTypes={shiftTypes}
        isSaving={shiftSettingsSaving}
        onClose={() => !shiftSettingsSaving && setShowShiftSettingsModal(false)}
        onSave={handleSaveShiftSettings}
      />

      <FadeModalScaffold
        open={showManagementModal}
        onClose={() => setShowManagementModal(false)}
        zIndex={70}
        overlayClassName="bg-[#000000]/30 backdrop-blur-sm"
        panelClassName="relative rounded-t-[32px] md:rounded-3xl w-full max-h-[90vh] min-h-0 overflow-hidden bg-card shadow-2xl md:max-w-5xl text-foreground flex flex-col pb-[env(safe-area-inset-bottom)]"
        panelOnClick={(e) => e.stopPropagation()}
        aria-label="จัดการพนักงานและกะ"
      >
            <HintTooltip tip="ปิด">
              <button onClick={() => setShowManagementModal(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-full transition-colors z-50" aria-label="ปิด">
                <X className="w-5 h-5" />
              </button>
            </HintTooltip>

            <div className="flex-1 min-h-0 overflow-y-auto bb-smooth-scroll flex flex-col md:flex-row md:overflow-hidden">
            <div className="w-full md:w-[340px] flex flex-col border-b md:border-b-0 md:border-r border-border shrink-0 md:min-h-0">
              <div className="p-5 border-b border-border flex justify-between items-center bg-card management-form-container shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-3xl">
                    <UserCog className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-normal text-foreground tracking-tight">การลา / เปลี่ยนกะ</h3>
                </div>
              </div>

              <div className="p-6 space-y-6 md:flex-1 md:min-h-0 md:overflow-y-auto md:bb-smooth-scroll">
                {saveSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#ffffff] rotate-45" />
                    </div>
                    <p className="text-[13px] text-emerald-700 font-normal">บันทึกข้อมูลเรียบร้อยแล้วค่ะ</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-foreground uppercase tracking-widest px-1">พนักงาน</label>
                  <div className="relative">
                    <select
                      className="w-full h-11 px-4 pr-10 rounded-3xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer text-base md:text-[14px] font-normal appearance-none text-foreground"
                      value={managementForm.employeeId}
                      onChange={(e) => setManagementForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    >
                      <option value="">เลือกพนักงาน...</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/60">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-foreground uppercase tracking-widest px-1">กะงาน / ประเภทการลา</label>
                  <div className="flex flex-wrap gap-2">
                    {shiftTypes.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setManagementForm(prev => ({ ...prev, shiftType: t.value }))}
                        className={cn(
                          'h-9 px-3 rounded-full border text-[13px] font-normal shadow-sm transition-all active:scale-[0.97] cursor-pointer',
                          t.className,
                          managementForm.shiftType === t.value && 'ring-2 ring-emerald-500/40 ring-offset-1 ring-offset-card'
                        )}
                        style={t.style}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-foreground uppercase tracking-widest px-1">ระบุช่วงวันที่</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 w-full">
                      <ClickableDatePicker
                        value={managementForm.startDate}
                        onChange={(e) => setManagementForm(prev => ({ ...prev, startDate: e.target.value }))}
                        placeholder="เริ่ม"
                        containerClassName="w-full"
                      />
                    </div>
                    <span className="text-foreground font-normal select-none hidden sm:block shrink-0">—</span>
                    <div className="flex-1 w-full">
                      <ClickableDatePicker
                        value={managementForm.endDate}
                        onChange={(e) => setManagementForm(prev => ({ ...prev, endDate: e.target.value }))}
                        min={managementForm.startDate}
                        placeholder="สิ้นสุด"
                        containerClassName="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[13px] font-normal text-foreground uppercase tracking-widest px-1">หมายเหตุ</label>
                  <textarea
                    placeholder="รายละเอียดเพิ่มเติม..."
                    className="w-full h-20 p-4 rounded-3xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-base md:text-[13px] leading-relaxed font-normal text-foreground placeholder:text-muted-foreground"
                    value={managementForm.remark}
                    onChange={(e) => setManagementForm(prev => ({ ...prev, remark: e.target.value }))}
                  />
                </div>
              </div>

              <div className="p-4 bg-card border-t border-border flex gap-3 shrink-0">
                <button
                  onClick={editingHistoryId ? cancelEditHistory : () => setShowManagementModal(false)}
                  className="flex-1 h-11 md:h-auto md:py-3 rounded-3xl bg-transparent border border-border text-foreground text-base md:text-[12px] font-normal hover:bg-muted/30 transition-all active:scale-95 shadow-sm cursor-pointer antialiased"
                >
                  {editingHistoryId ? 'ยกเลิกการแก้ไข' : 'ปิดหน้าต่าง'}
                </button>
                <button
                  onClick={handleSaveManagement}
                  className={`flex-1 h-11 md:h-auto md:py-3 rounded-3xl font-normal text-base md:text-[12px] shadow-lg transition-all active:scale-95 cursor-pointer antialiased ${
                    editingHistoryId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 text-[#ffffff]' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 text-[#ffffff]'
                  }`}
                >
                  {editingHistoryId ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-card/30 min-w-0 md:min-h-0">
              <div className="p-5 border-b border-border flex justify-between items-center bg-card pr-14 shrink-0">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-lg font-normal text-foreground tracking-tight">ประวัติ</h3>
                </div>
              </div>

              <div className="p-4 border-b border-border bg-card shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-sm">
                    <div className="flex-1 w-full">
                      <ClickableDatePicker
                        value={historyFilter.start}
                        onChange={(e) => setHistoryFilter(prev => ({ ...prev, start: e.target.value }))}
                        placeholder="กรองตั้งแต่วันที่"
                        containerClassName="w-full"
                      />
                    </div>
                    <span className="text-foreground font-normal select-none text-xs hidden sm:block shrink-0">—</span>
                    <div className="flex-1 w-full">
                      <ClickableDatePicker
                        value={historyFilter.end}
                        onChange={(e) => setHistoryFilter(prev => ({ ...prev, end: e.target.value }))}
                        placeholder="ถึงวันที่"
                        containerClassName="w-full"
                      />
                    </div>
                  </div>
              </div>

              <div className="p-5 md:flex-1 md:min-h-0 md:overflow-y-auto md:bb-smooth-scroll">
                {mgmtHistory.length === 0 ? (
                  <div className="min-h-[12rem] flex flex-col items-center justify-center text-foreground/20 space-y-2">
                    <CalendarDays className="w-8 h-8" />
                    <p className="text-sm font-normal uppercase tracking-widest">ไม่พบประวัติการจัดการ</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto bb-smooth-scroll bb-smooth-scroll-chain-y scrollbar-thin border border-border rounded-3xl pb-8">
                    <table className="w-max text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                      <thead className="sticky top-0 z-10 shadow-sm">
                        <tr>
                          {mgmtColumns.map(col => (
                            <ColumnHeader
                              key={col.id}
                              col={col}
                              onResize={handleColumnResize}
                              onResizeEnd={handleColumnResizeEnd}
                            />
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mgmtHistory.map((item) => (
                          <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="p-3 text-[13px] font-normal text-foreground border-r border-border truncate bg-transparent">
                              {item.employee_name}
                            </td>
                            <td className="p-3 text-[12px] font-normal text-foreground border-r border-border truncate bg-transparent">
                              {format(new Date(item.startDate), 'dd/MM/yyyy')}
                              {item.startDate !== item.endDate && ` → ${format(new Date(item.endDate), 'dd/MM/yyyy')}`}
                            </td>
                            <td className="p-3 text-[12px] font-normal text-foreground border-r border-border truncate bg-transparent">
                              <span
                                className={`px-2 py-0.5 rounded-full ${item.color} border inline-block bb-pastel-surface`}
                                style={item.colorStyle}
                              >
                                {shiftTypes.find((t) => t.value === item.location)?.label || item.location}
                              </span>
                            </td>
                            <td className="p-3 text-[12px] font-normal text-foreground border-r border-border truncate bg-transparent">
                              {item.remark || '-'}
                            </td>
                            <td className="p-3 text-center bg-transparent">
                              <div className="flex items-center justify-center gap-1.5">
                                <HintTooltip tip="แก้ไขประวัติ">
                                  <button
                                    onClick={() => handleEditHistory(item)}
                                    className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center justify-center"
                                    aria-label="แก้ไขประวัติ"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </HintTooltip>
                                <HintTooltip tip="ลบประวัติการจัดการ">
                                  <button
                                    onClick={() => handleDeleteHistory(item)}
                                    disabled={confirmDeleteId === item.id}
                                    className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
                                    aria-label="ลบประวัติการจัดการ"
                                  >
                                    {confirmDeleteId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  </button>
                                </HintTooltip>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            </div>
      </FadeModalScaffold>

      <FadeModalScaffold
        open={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        zIndex={110}
        overlayClassName="bg-[#000000]/10 backdrop-blur-sm"
        panelClassName="fixed bottom-0 left-0 right-0 rounded-t-[32px] w-full max-h-[85vh] overflow-y-auto bb-smooth-scroll bg-card shadow-2xl md:relative md:rounded-3xl md:max-w-sm md:max-h-none md:translate-y-0 p-6 max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-foreground border border-border"
        aria-label="เพิ่มพนักงานใหม่"
      >
            <HintTooltip tip="ปิด">
              <button onClick={() => setShowAddEmployeeModal(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-full transition-colors z-10" aria-label="ปิด">
                <X className="w-5 h-5" />
              </button>
            </HintTooltip>
            <div className="w-12 h-1.5 bg-[#000000]/10 rounded-full mx-auto mb-6 md:hidden" />
            <h3 className="text-xl font-normal text-foreground mb-4 uppercase tracking-tight pr-10">เพิ่มพนักงานใหม่</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-normal uppercase tracking-wider text-foreground/70 ml-1">ชื่อ</label>
                <input
                  autoFocus
                  type="text"
                  value={newEmployeeName}
                  onChange={e => setNewEmployeeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                  placeholder="กรอกชื่อพนักงาน"
                  className="w-full h-11 bg-card border border-border rounded-xl px-4 py-3 text-base md:text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="flex-1 h-11 md:h-auto md:py-3 text-foreground/60 font-normal hover:bg-muted/30 rounded-xl transition-all text-base md:text-sm cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddEmployee}
                  disabled={loading || !newEmployeeName.trim()}
                  className="flex-1 h-11 md:h-auto md:py-3 bg-[#000000] text-[#ffffff] font-normal rounded-xl hover:bg-[#000000]/80 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-base md:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  ยืนยัน
                </button>
              </div>
            </div>
      </FadeModalScaffold>

      <FadeModalScaffold
        open={showRegularHolidayModal}
        onClose={() => setShowRegularHolidayModal(false)}
        zIndex={110}
        overlayClassName="bg-[#000000]/10 backdrop-blur-sm"
        panelClassName="fixed bottom-0 left-0 right-0 rounded-t-[32px] w-full max-h-[85vh] overflow-y-auto bb-smooth-scroll bg-card shadow-2xl md:relative md:rounded-3xl md:max-w-3xl md:max-h-none md:translate-y-0 p-6 max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-foreground border border-border"
        aria-label="จัดการวันหยุดประจำ"
      >
            <HintTooltip tip="ปิด">
              <button onClick={() => setShowRegularHolidayModal(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-full transition-colors z-10" aria-label="ปิด">
                <X className="w-5 h-5" />
              </button>
            </HintTooltip>
            <div className="w-12 h-1.5 bg-[#000000]/10 rounded-full mx-auto mb-6 md:hidden" />
            <h3 className="text-xl font-normal text-foreground mb-6 uppercase tracking-tight flex items-center gap-2 pr-10">
              <Calendar className="w-5 h-5 text-foreground/40" />
              จัดการวันหยุดประจำ
            </h3>
            
            <div className="flex flex-col-reverse md:flex-row gap-6">
              {/* Left Column: Form */}
              <div className="flex flex-col w-full md:w-[260px] shrink-0">
                <div className="flex-1 flex flex-col space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-wider text-foreground/70 ml-1">พนักงาน</label>
                    <div className="relative">
                      <select
                        className="w-full h-11 px-4 pr-10 rounded-3xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer text-base md:text-[14px] font-normal appearance-none text-foreground"
                        value={holidayFormEmployee}
                        onChange={(e) => {
                          setHolidayFormEmployee(e.target.value);
                          setHolidayFormDays(regularHolidays[e.target.value] || []);
                          setHolidaySaveSuccess(false);
                        }}
                      >
                        <option value="">เลือกพนักงาน...</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/40">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  
                  {holidayFormEmployee && (
                    <div className="space-y-2.5">
                      <label className="text-[13px] font-normal uppercase tracking-wider text-foreground/70 ml-1">เลือกวันหยุดประจำสัปดาห์</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 1, label: 'จ.' },
                          { id: 2, label: 'อ.' },
                          { id: 3, label: 'พ.' },
                          { id: 4, label: 'พฤ.' },
                          { id: 5, label: 'ศ.' },
                          { id: 6, label: 'ส.' },
                          { id: 0, label: 'อา.' },
                        ].map(day => {
                          const isSelected = holidayFormDays.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              onClick={() => {
                                setHolidayFormDays(prev => 
                                  prev.includes(day.id) ? prev.filter(d => d !== day.id) : [...prev, day.id]
                                );
                                setHolidaySaveSuccess(false);
                              }}
                              className={`h-11 md:h-auto py-2 rounded-xl text-base md:text-[13px] font-normal transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#000000] text-[#ffffff] shadow-md' 
                                  : 'bg-card border border-border text-foreground hover:bg-muted/30'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border mt-6 space-y-3">
                  {holidaySaveSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 flex items-center justify-center gap-2 animate-in fade-in duration-300">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-[13px] text-emerald-700 font-normal">บันทึกข้อมูลสำเร็จนะคะ</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRegularHolidayModal(false)}
                      className="flex-1 h-11 md:h-auto md:py-3 text-foreground/60 font-normal hover:bg-muted/30 rounded-xl transition-all text-base md:text-sm cursor-pointer"
                    >
                      ปิดหน้าต่าง
                    </button>
                    <button
                      onClick={handleSaveRegularHolidays}
                      disabled={!holidayFormEmployee}
                      className="flex-1 h-11 md:h-auto md:py-3 bg-[#000000] text-[#ffffff] font-normal rounded-xl hover:bg-[#000000]/80 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-base md:text-sm cursor-pointer"
                    >
                      บันทึกข้อมูล
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary overview — visible on all screen sizes */}
              <div className="flex-1 w-full h-full border border-border rounded-3xl p-4 bg-card/50">
                <h4 className="text-[14px] font-normal text-foreground mb-3 px-1">สรุปวันหยุดประจำของพนักงาน</h4>
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-2 pb-2 border-b border-border text-[12px] text-foreground/60 uppercase tracking-widest px-1">
                  <span>พนักงาน</span>
                  <span>วันหยุดประจำ</span>
                </div>
                <div className="space-y-2 md:space-y-0">
                  {profiles.map(p => {
                    const days = regularHolidays[p.id] || [];
                    if (days.length === 0) return null;
                    const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
                    const sortedDays = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));

                    return (
                      <div
                        key={p.id}
                        className="flex items-start justify-between gap-3 py-2.5 px-3 rounded-2xl border border-border bg-card md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:rounded-none md:border-0 md:border-b md:border-border md:bg-transparent md:px-1 md:py-2 md:hover:bg-muted/30 md:transition-colors"
                      >
                        <span className="text-[14px] md:text-[13px] font-normal text-foreground shrink-0">{p.full_name}</span>
                        <span className="text-[13px] font-normal text-foreground/70 md:text-foreground text-right md:text-left">
                          {sortedDays.map(d => dayLabels[d]).join(', ')}
                        </span>
                      </div>
                    );
                  })}
                  {profiles.every(p => (regularHolidays[p.id] || []).length === 0) && (
                    <p className="text-[13px] text-foreground/50 px-1 py-2">ยังไม่มีการกำหนดวันหยุดประจำ</p>
                  )}
                </div>
              </div>
            </div>
      </FadeModalScaffold>

      {toastAlert && (
        <FloatingAlert
          message={toastAlert.message}
          anchor={{ x: toastAlert.x, y: toastAlert.y }}
          onDismiss={() => setToastAlert(null)}
        />
      )}
    </div>
  );
}