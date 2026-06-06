'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Plus, Trash2, Undo2, Redo2, UserCog, AlertTriangle, Loader2, ChevronDown, X, Calendar, CalendarDays, Download, Pencil } from 'lucide-react';
import { startOfWeek, addDays, format, parseISO, isValid } from 'date-fns';

import { useRouter, useSearchParams } from 'next/navigation';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';
import { FloatingAlert } from '@/components/ui/floating-alert';
import { saveRegularHolidays } from '@/app/actions/holiday-actions';

import { deleteShift, revalidateAppPaths, updateStaffOrder, saveShift, deleteManagementHistoryRange } from '@/app/actions/shift-actions';
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
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';

// --- Constants Outside Component ---
const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const shiftTypes = [
  { label: '6:30', value: '6:30', color: 'bg-[#d4edda] text-[#000000] border-[#c3e6cb]' },
  { label: '7:00', value: '7:00', color: 'bg-[#ffffff] text-[#000000] border-gray-300' },
  { label: '8:00', value: '8:00', color: 'bg-[#fff3cd] text-[#000000] border-[#ffeeba]' },
  { label: 'ร้านซักผ้า', value: 'ร้านซักผ้า', color: 'bg-[#d1ecf1] text-[#000000] border-[#bee5eb]' },
  { label: 'ไปสาขา 2', value: 'ไปสาขา 2', color: 'bg-[#d1ecf1] text-[#000000] border-[#bee5eb]' },
  { label: 'ลา', value: 'ลา', color: 'bg-[#f8d7da] text-[#000000] border-[#f5c6cb]' }
];

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
      className="p-3 text-[13px] font-normal text-[#000000] border-b border-r border-[#000000]/10 bg-[#fdfcf0] text-center relative group select-none overflow-hidden"
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

// --- Sub-component: SortableEmployeeRow ---
interface SortableEmployeeRowProps {
  id: string;
  profile: Profile;
  weekDays: string[];
  shifts: Shift[];
  shiftTypes: typeof shiftTypes;
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
  id, profile, weekDays, shifts, shiftTypes, onCellClick,
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

  const style = {
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
        "grid grid-cols-8 border-b border-[#000000]/5 hover:bg-[#000000]/5 transition-all duration-300 group relative bg-transparent",
        isDragging && "opacity-80 scale-[1.02] shadow-xl z-[100] bg-white ring-1 ring-black/5 rounded-3xl cursor-grabbing"
      )}
    >
      <div className="p-2 border-r border-[#000000]/5 flex items-center gap-2 bg-[#fdfcf0] sticky left-0 z-20 text-black font-normal md:static md:bg-transparent">
        <div
          {...attributes}
          {...(isReadOnly ? {} : listeners)}
          className={`p-3 h-11 w-11 rounded-3xl transition-all touch-none flex items-center justify-center ${isReadOnly ? 'opacity-60 cursor-not-allowed text-[#000000]/20' : 'cursor-grab active:cursor-grabbing hover:bg-gray-100 text-[#000000]/40 hover:text-[#000000]/70'}`}
          title="ลากเพื่อเปลี่ยนลำดับ"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1 py-1">
          {editingNameId === id ? (
            <input
              autoFocus
              disabled={isReadOnly}
              className="w-full h-11 bg-white border border-blue-400 text-base font-normal text-black px-3 rounded-3xl outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => onSaveName(id)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveName(id)}
            />
          ) : (
            <span
              onClick={() => !isReadOnly && onNameClick(id, profile.full_name)}
              className={`text-[16px] font-normal text-[#000000] truncate leading-[1.6] tracking-tight transition-colors block ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-text hover:text-blue-600'}`}
            >
              {profile.full_name}
            </span>
          )}
        </div>
        <button
          onClick={() => onDeleteEmployee(id)}
          disabled={isReadOnly}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          title="ลบพนักงานถาวร"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {weekDays.map(date => {
        const shift = shifts.find(s =>
          (s.employee_id === profile.id || (s as any).profile_id === profile.id) &&
          s.start_time.split('T')[0] === date
        );
        const type = shiftTypes.find(t => t.value === shift?.metadata?.location);
        return (
          <div
            key={date}
            onClick={(e) => !isReadOnly && onCellClick(profile.id, date, shift, e.clientX, e.clientY)}
            className={`p-1 border-r last:border-0 border-[#000000]/5 min-h-[52px] group/cell relative ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            title={shift?.metadata?.remark || ''}
          >
            {shift && (shift.status && shift.metadata?.location) ? (
              <div className={`h-full w-full rounded-lg border p-1.5 flex flex-col justify-center items-center text-center transition-all duration-200 group-hover/cell:scale-[0.97] group-hover/cell:shadow-md shadow-sm ${type?.color || 'bg-white border-gray-300 text-gray-900'}`}>
                <span className="text-[14.5px] font-normal leading-none tracking-tight">{type?.label || shift.metadata?.location}</span>
                {shift.metadata?.remark && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-400/60" />
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
  const [holidays, setHolidays] = useState<any[]>(initialHolidays);
  const [orderedProfileIds, setOrderedProfileIds] = useState<string[]>(initialProfiles.map(p => p.id));
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchParams?.get('showRegularHolidays') === 'true') {
      setShowRegularHolidayModal(true);
    }
  }, [searchParams]);

  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string; shift?: any; x: number; y: number } | null>(null);
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

  const [mgmtHistory, setMgmtHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState({ start: '', end: '' });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  const [showRegularHolidayModal, setShowRegularHolidayModal] = useState(false);
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

  useEffect(() => {
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
  }, [hasServerRegularHolidayData, initialProfiles, initialShifts, initialHolidays, initialRegularHolidays, initialDateStr]);

  const pushToHistory = useCallback((currentProfiles: any[], currentOrder: string[], currentShifts: any[]) => {
    setUndoStack(prev => {
      const newStack = [...prev, {
        profiles: JSON.parse(JSON.stringify(currentProfiles)),
        orderedProfileIds: [...currentOrder],
        shifts: JSON.parse(JSON.stringify(currentShifts))
      }];
      return newStack.slice(-20);
    });
    setRedoStack([]);
  }, []);

  const undo = async () => {
    if (blockIfReadOnly()) return;
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack(prev => [{
      profiles: JSON.parse(JSON.stringify(profiles)),
      orderedProfileIds: [...orderedProfileIds],
      shifts: JSON.parse(JSON.stringify(shifts))
    }, ...prev].slice(0, 20));
    setUndoStack(newUndoStack);

    setProfiles(previous.profiles);
    setOrderedProfileIds(previous.orderedProfileIds);
    setShifts(previous.shifts);

    try {
      await updateStaffOrder(previous.orderedProfileIds);
      const profileUpdates = previous.profiles.map((p: any) =>
        supabase.from('profiles').update({ full_name: p.full_name }).eq('id', p.id)
      );
      await Promise.all(profileUpdates);
      await supabase.from('shifts').delete().gte('start_time', weekDays[0] + 'T00:00:00').lte('start_time', weekDays[6] + 'T23:59:59');

      if (previous.shifts.length > 0) {
        await supabase.from('shifts').insert(previous.shifts.map((s: any) => {
          const { id, created_at, ...rest } = s; 
          return rest;
        }));
      }
      await revalidateAppPaths();
    } catch { }
  };

  const redo = async () => {
    if (blockIfReadOnly()) return;
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setUndoStack(prev => [...prev, {
      profiles: JSON.parse(JSON.stringify(profiles)),
      orderedProfileIds: [...orderedProfileIds],
      shifts: JSON.parse(JSON.stringify(shifts))
    }].slice(-20));
    setRedoStack(newRedoStack);

    setProfiles(next.profiles);
    setOrderedProfileIds(next.orderedProfileIds);
    setShifts(next.shifts);

    try {
      await updateStaffOrder(next.orderedProfileIds);
      const profileUpdates = next.profiles.map((p: any) =>
        supabase.from('profiles').update({ full_name: p.full_name }).eq('id', p.id)
      );
      await Promise.all(profileUpdates);
      await supabase.from('shifts').delete().gte('start_time', weekDays[0] + 'T00:00:00').lte('start_time', weekDays[6] + 'T23:59:59');

      if (next.shifts.length > 0) {
        await supabase.from('shifts').insert(next.shifts.map((s: any) => {
          const { id, created_at, ...rest } = s;
          return rest;
        }));
      }
      await revalidateAppPaths();
    } catch { }
  };

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

      const grouped: any[] = [];
      const sorted = [...(data || [])].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      sorted.forEach(shift => {
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
              const profiles = (shift as any).profiles;
              if (Array.isArray(profiles)) return profiles[0]?.full_name || 'Unknown';
              return profiles?.full_name || 'Unknown';
            })(),
            location: shift.metadata?.location,
            remark: shift.metadata?.remark,
            startDate: shift.start_time,
            endDate: shift.start_time,
            color: shiftTypes.find(t => t.value === shift.metadata?.location)?.color || 'bg-white',
            metadata: { ...shift.metadata }
          });
        }
      });

      setMgmtHistory(grouped.reverse());
    } catch { }
  }, [historyFilter]);

  useEffect(() => {
    if (showManagementModal) {
      fetchMgmtHistory();
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

  const handleEditHistory = (item: any) => {
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

  const handleDeleteHistory = async (historyItem: any) => {
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

    } catch (err: any) {
      console.error('Failed to delete history:', err);
      setMgmtHistory(previousHistory);
      alert('ไม่สามารถลบประวัติได้: ' + (err.message || 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ'));
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
      const newShifts = [];
      const datesToDelete = [];

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
        const { error: insError } = await supabase.from('shifts')
          .insert(newShifts);
        if (insError) throw insError;
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      const empName = profiles.find(p => p.id === employeeId)?.full_name || 'พนักงาน';
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
        const empIdMatch = s.employee_id === employeeId || (s as any).profile_id === employeeId;
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
    const latestShift = shifts.find(s =>
      (s.employee_id === selectedCell.employeeId || (s as any).profile_id === selectedCell.employeeId) &&
      s.start_time.split('T')[0] === selectedCell.date
    );

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
        const existing = holidays.find(h => h.date === date);
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
      const { toPng } = await import('html-to-image');
      const element = document.getElementById('blackandbrew-schedule-table');
      if (!element) return;

      setLoading(true);
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#fdfcf0',
        style: {
          transform: 'scale(1)',
          margin: '0',
          padding: '0',
          border: 'none',
          boxShadow: 'none',
        }
      });

      const link = document.createElement('a');
      link.download = `Schedule-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกตารางงานเป็นรูปภาพค่ะ');
    } finally {
      setLoading(false);
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
    <div className="flex flex-col h-screen bg-transparent text-[#000000] overflow-hidden">
      <header className="md:h-14 border-b border-[#000000]/5 px-4 md:px-6 flex flex-col md:flex-row items-center justify-between bg-transparent shrink-0 z-20 shadow-sm py-2 md:py-0">
        <div className="flex items-center justify-between w-full md:w-auto gap-6 mb-2 md:mb-0">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={isReadOnly || undoStack.length === 0}
              className={`h-11 px-3 rounded-3xl transition-all duration-200 active:scale-95 flex items-center justify-center ${!isReadOnly && undoStack.length > 0 ? 'hover:bg-[#000000]/5 text-[#000000] cursor-pointer' : 'text-[#000000]/30 cursor-not-allowed'}`}
              title="เลิกทำ"
            >
              <Undo2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={redo}
              disabled={isReadOnly || redoStack.length === 0}
              className={`h-11 px-3 rounded-3xl transition-all duration-200 active:scale-95 flex items-center justify-center ${!isReadOnly && redoStack.length > 0 ? 'hover:bg-[#000000]/5 text-[#000000] cursor-pointer' : 'text-[#000000]/30 cursor-not-allowed'}`}
              title="ทำซ้ำ"
            >
              <Redo2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center">
            <ClickableDatePicker
              value={initialDateStr}
              onChange={handleDateChange}
              containerClassName="w-fit h-11 scale-100 origin-right"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full overflow-x-auto whitespace-nowrap pb-2 scrollbar-none md:overflow-visible md:pb-0 md:justify-end">
          <button
            onClick={() => setShowRegularHolidayModal(true)}
            disabled={isReadOnly}
            className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-[#000000] bg-[#fdfcf0] hover:bg-[#000000]/5 rounded-3xl border border-[#000000]/10 transition-all duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            วันหยุดประจำ
          </button>

          <button
            onClick={() => setShowManagementModal(true)}
            disabled={isReadOnly}
            className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-[#000000] bg-[#fdfcf0] hover:bg-[#000000]/5 rounded-3xl border border-[#000000]/10 transition-all duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <UserCog className="w-4 h-4" />
            การลา/เปลี่ยนกะ
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={isReadOnly}
            className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-[#000000] bg-[#fdfcf0] hover:bg-[#000000]/5 rounded-3xl border border-[#000000]/10 transition-all duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            ล้างทั้งหมด
          </button>

          <button
            onClick={exportScheduleImage}
            className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-[#000000] bg-[#fdfcf0] hover:bg-[#000000]/5 rounded-3xl border border-[#000000]/10 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wide shadow-sm"
          >
            <Download className="w-4 h-4" />
            บันทึกรูปภาพ
          </button>

          <button
            onClick={() => setShowAddEmployeeModal(true)}
            disabled={isReadOnly}
            className="flex items-center gap-1.5 h-11 px-4 text-xs font-normal text-[#000000] bg-[#fdfcf0] hover:bg-[#000000]/5 rounded-3xl border border-[#000000]/10 transition-all duration-200 active:scale-95 uppercase tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มพนักงาน
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col bg-transparent">
        <div className="flex-1 flex flex-col bg-[#fdfcf0]/80 backdrop-blur-sm border border-[#000000]/5 rounded-3xl overflow-hidden shadow-sm">
          <div className="flex-1 overflow-x-auto scrollbar-thin overflow-y-auto pb-6">
            <div id="blackandbrew-schedule-table" className="min-w-[900px] bg-[#fdfcf0] h-fit flex flex-col">
              <div className="grid grid-cols-8 border-b border-[#000000]/5 bg-red-50/10 sticky top-0 z-[16]">
                <div className="p-2.5 border-r border-[#000000]/5 flex items-center justify-center bg-[#fdfcf0] sticky left-0 z-20 text-[#000000] font-normal md:static md:bg-red-50/20">
                  <span className="text-[12px] text-[#991b1b] font-normal uppercase tracking-widest">นักขัตฤกษ์</span>
                </div>
                {weekDays.map(date => {
                  const holiday = holidays.find(h => h.date === date);
                  return (
                    <div
                      key={`holiday-${date}`}
                      onClick={() => { if (!isReadOnly) { setEditingHoliday(date); setHolidayInput(holiday?.name || ''); } }}
                      className={`p-1 border-r last:border-0 border-[#000000]/5 flex items-center justify-center min-h-[38px] transition-colors ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-red-50'}`}
                    >
                      {editingHoliday === date ? (
                        <input
                          autoFocus
                          disabled={isReadOnly}
                          className="w-full h-full bg-[#fdfcf0] border border-red-200 text-[14px] text-[#7f1d1d] font-normal text-center rounded focus:outline-none ring-1 ring-red-400 disabled:opacity-60 disabled:cursor-not-allowed"
                          value={holidayInput}
                          onChange={(e) => setHolidayInput(e.target.value)}
                          onBlur={() => handleSaveHoliday(date)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveHoliday(date)}
                        />
                      ) : (
                        <span className="text-[14px] font-normal text-[#7f1d1d] text-center leading-tight tracking-tight px-1 uppercase">
                          {holiday?.name || ''}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-8 bg-[#000000]/5 border-b border-[#000000]/10 shrink-0 sticky top-[38px] z-[15]">
                <div className="p-2.5 border-r border-[#000000]/5 flex items-center justify-center bg-[#fdfcf0] sticky left-0 z-20 text-[#000000] font-normal md:static md:bg-transparent">
                  <span className="text-[13px] text-[#000000] font-normal uppercase tracking-widest">พนักงาน</span>
                </div>
                {weekDays.map((date) => {
                  const d = new Date(date);
                  const isToday = date === todayStr;
                  return (
                    <div key={date} className="p-1.5 flex flex-col items-center justify-center text-center border-r last:border-0 border-[#000000]/10 transition-colors min-h-[50px] bg-transparent">
                      <div className="text-[12px] font-normal uppercase tracking-tighter mb-0 text-[#000000]">{dayLabels[d.getDay()]}</div>
                      <div className={`text-xl font-normal w-8 h-8 flex items-center justify-center mt-0.5 rounded-full ${isToday ? 'bg-[#ffda66] text-[#000000]' : 'text-[#000000]'}`}>{d.getDate()}</div>
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
                      const p = profiles.find(x => x.id === pid);
                      if (!p) return null;
                      return (
                        <SortableEmployeeRow
                          key={p.id}
                          id={p.id}
                          profile={p}
                          weekDays={weekDays}
                          shifts={shifts}
                          shiftTypes={shiftTypes}
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
                    const p = profiles.find(x => x.id === pid);
                    if (!p) return null;
                    return (
                      <SortableEmployeeRow
                        key={p.id}
                        id={p.id}
                        profile={p}
                        weekDays={weekDays}
                        shifts={shifts}
                        shiftTypes={shiftTypes}
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

              <div className="grid grid-cols-8 border-t border-[#000000]/10 bg-[#000000]/5 sticky bottom-0">
                <div className="p-2 border-r border-[#000000]/5 flex items-center justify-center bg-transparent">
                </div>
                {weekDays.map(date => {
                  const VALID_SHIFTS = ['6:30', '7:00', '8:00'];
                  const fohCount = new Set(
                    shifts
                      .filter(s => {
                        const loc = s.metadata?.location?.trim();
                        const isSameDay = isSameThaiDay(s.start_time, date);
                        const isActiveEmployee = s.employee_id && orderedProfileIds.includes(s.employee_id);
                        return isSameDay && s.status !== 'on_leave' && isActiveEmployee && VALID_SHIFTS.includes(loc || '');
                      })
                      .map(s => s.employee_id)
                  ).size;
                  return (
                    <div key={`foh-${date}`} className={`p-1.5 border-r last:border-0 border-[#000000]/5 flex items-center justify-center ${date === todayStr ? 'bg-blue-50/50' : ''}`}>
                      <span className={`text-[15px] font-normal ${fohCount > 0 ? 'text-emerald-600' : 'text-[#000000]/30'}`}>{fohCount}</span>
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
            className="absolute bg-[#fdfcf0]/95 backdrop-blur-md border border-[#000000]/10 w-48 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2.5 border-b border-[#000000]/5 bg-[#000000]/5">
              <h2 className="text-[13px] font-normal text-[#000000] truncate">
                {profiles.find(p => p.id === selectedCell.employeeId)?.full_name}
              </h2>
            </div>
            <div className="p-1.5 grid gap-1">
              {shiftTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleSave(type.value)}
                  disabled={isReadOnly}
                  className={`h-11 md:h-auto py-1.5 px-3 rounded-lg border text-base md:text-[12px] font-normal shadow-sm w-full text-left transition-all duration-200 hover:brightness-95 hover:shadow-md active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${type.color}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {selectedCell.shift && (
              <div className="p-1.5 bg-[#fdfcf0] border-t border-[#000000]/5">
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

      {showClearConfirm && (
        <div className="fixed inset-0 bg-[#000000]/20 backdrop-blur-sm bb-modal-backdrop z-[60] flex items-end justify-center md:items-center p-0 md:p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowClearConfirm(false); }}>
          <div className="fixed bottom-0 left-0 right-0 rounded-t-[32px] w-full max-h-[85vh] overflow-y-auto bg-[#fdfcf0] shadow-2xl bb-sheet-panel md:relative md:rounded-3xl md:max-w-sm md:max-h-none md:translate-y-0 p-6 max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[#000000] text-center space-y-4">
            <div className="w-12 h-1.5 bg-[#000000]/10 rounded-full mx-auto mb-6 md:hidden" />
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-normal text-[#000000]">ยืนยันการลบข้อมูล</h3>
            <p className="text-sm text-[#000000]/70">คุณแน่ใจหรือไม่ที่จะลบข้อมูลกะงาน<br />ของสัปดาห์นี้ทั้งหมด</p>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="h-11 md:h-auto py-2.5 rounded-xl bg-[#000000]/5 hover:bg-[#000000]/10 text-[#000000] text-base md:text-sm font-normal transition-colors cursor-pointer"
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
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-[#fdfcf0]/60 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-normal text-blue-600 uppercase tracking-widest">กำลังดำเนินการ...</p>
        </div>
      )}

      {showManagementModal && (
        <div
          className="fixed inset-0 bg-[#000000]/30 backdrop-blur-sm bb-modal-backdrop z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setShowManagementModal(false); }}
        >
          <div className="relative rounded-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#fdfcf0] shadow-2xl bb-modal-panel md:max-w-5xl p-6 text-[#000000] flex flex-col md:flex-row">
            <div className="w-full md:w-[340px] flex flex-col border-r border-[#000000]/5 shrink-0">
              <div className="p-5 border-b border-[#000000]/5 flex justify-between items-center bg-[#fdfcf0]/50 management-form-container">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-3xl">
                    <UserCog className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-normal text-[#000000] tracking-tight">การลา / เปลี่ยนกะ</h3>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {saveSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-[#ffffff] rotate-45" />
                    </div>
                    <p className="text-[13px] text-emerald-700 font-normal">บันทึกข้อมูลเรียบร้อยแล้วค่ะ</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-[#000000] uppercase tracking-widest px-1">พนักงาน</label>
                  <div className="relative">
                    <select
                      className="w-full h-11 px-4 pr-10 rounded-3xl border border-[#000000]/5 bg-[#fdfcf0]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer text-base md:text-[14px] font-normal appearance-none text-[#000000]"
                      value={managementForm.employeeId}
                      onChange={(e) => setManagementForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    >
                      <option value="">เลือกพนักงาน...</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#000000]/60">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-[#000000] uppercase tracking-widest px-1">กะงาน / ประเภทการลา</label>
                  <div className="relative group/select">
                    <select
                      className={`w-full h-11 px-4 pr-10 rounded-3xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer text-base md:text-[14px] font-normal shadow-sm appearance-none text-[#000000] ${
                        shiftTypes.find(t => t.value === managementForm.shiftType)?.color || 'bg-[#fdfcf0] border-[#000000]/5'
                      }`}
                      value={managementForm.shiftType}
                      onChange={(e) => setManagementForm(prev => ({ ...prev, shiftType: e.target.value }))}
                    >
                      {shiftTypes.map(t => (
                        <option key={t.value} value={t.value} className="bg-[#fdfcf0] text-[#000000] font-normal py-2">
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-[#000000]">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-[#000000] uppercase tracking-widest px-1">ระบุช่วงวันที่</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 w-full">
                      <ClickableDatePicker
                        value={managementForm.startDate}
                        onChange={(e) => setManagementForm(prev => ({ ...prev, startDate: e.target.value }))}
                        placeholder="เริ่ม"
                        containerClassName="w-full"
                      />
                    </div>
                    <span className="text-[#000000] font-normal select-none hidden sm:block shrink-0">—</span>
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
                  <label className="text-[13px] font-normal text-[#000000] uppercase tracking-widest px-1">หมายเหตุ</label>
                  <textarea
                    placeholder="รายละเอียดเพิ่มเติม..."
                    className="w-full h-20 p-4 rounded-3xl border border-[#000000]/5 bg-[#fdfcf0]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-base md:text-[13px] leading-relaxed font-normal text-[#000000]"
                    value={managementForm.remark}
                    onChange={(e) => setManagementForm(prev => ({ ...prev, remark: e.target.value }))}
                  />
                </div>
              </div>

              <div className="p-4 bg-[#fdfcf0] border-t border-[#000000]/5 flex gap-3">
                <button
                  onClick={editingHistoryId ? cancelEditHistory : () => setShowManagementModal(false)}
                  className="flex-1 h-11 md:h-auto md:py-3 rounded-3xl bg-transparent border border-[#000000]/10 text-[#000000] text-base md:text-[12px] font-normal hover:bg-[#000000]/5 transition-all active:scale-95 shadow-sm cursor-pointer antialiased"
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

            <div className="flex-1 flex flex-col bg-[#fdfcf0]/30 min-w-0">
              <div className="p-5 border-b border-[#000000]/5 flex justify-between items-center bg-[#fdfcf0]">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-[#000000]/40" />
                  <h3 className="text-lg font-normal text-[#000000] tracking-tight">ประวัติ</h3>
                </div>
                <button onClick={() => setShowManagementModal(false)} className="p-2 hover:bg-[#000000]/5 rounded-full text-[#000000]/40 transition-all cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-[#000000]/5 bg-[#fdfcf0]">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-sm">
                    <div className="flex-1 w-full">
                      <ClickableDatePicker
                        value={historyFilter.start}
                        onChange={(e) => setHistoryFilter(prev => ({ ...prev, start: e.target.value }))}
                        placeholder="กรองตั้งแต่วันที่"
                        containerClassName="w-full"
                      />
                    </div>
                    <span className="text-[#000000] font-normal select-none text-xs hidden sm:block shrink-0">—</span>
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

              <div className="flex-1 overflow-y-auto p-5">
                {mgmtHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#000000]/20 space-y-2">
                    <CalendarDays className="w-8 h-8" />
                    <p className="text-sm font-normal uppercase tracking-widest">ไม่พบประวัติการจัดการ</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto h-full scrollbar-thin border border-[#000000]/5 rounded-3xl pb-8">
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
                          <tr key={item.id} className="border-b border-[#000000]/5 hover:bg-[#000000]/5 transition-colors">
                            <td className="p-3 text-[13px] font-normal text-[#000000] border-r border-[#000000]/5 truncate bg-transparent">
                              {item.employee_name}
                            </td>
                            <td className="p-3 text-[12px] font-normal text-[#000000] border-r border-[#000000]/5 truncate bg-transparent">
                              {format(new Date(item.startDate), 'dd/MM/yyyy')}
                              {item.startDate !== item.endDate && ` → ${format(new Date(item.endDate), 'dd/MM/yyyy')}`}
                            </td>
                            <td className="p-3 text-[12px] font-normal text-[#000000] border-r border-[#000000]/5 truncate bg-transparent">
                              <span className={`px-2 py-0.5 rounded-full ${item.color} border border-[#000000]/10 inline-block`}>
                                {item.location}
                              </span>
                            </td>
                            <td className="p-3 text-[12px] font-normal text-[#000000]/80 border-r border-[#000000]/5 truncate bg-transparent">
                              {item.remark || '-'}
                            </td>
                            <td className="p-3 text-center bg-transparent">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleEditHistory(item)}
                                  className="p-1.5 text-[#000000]/40 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center justify-center"
                                  title="แก้ไขประวัติ"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteHistory(item)}
                                  disabled={confirmDeleteId === item.id}
                                  className="p-1.5 text-[#000000]/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
                                  title="ลบประวัติการจัดการ"
                                >
                                  {confirmDeleteId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
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
        </div>
      )}

      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center md:items-center p-0 md:p-4">
          <div className="absolute inset-0 bg-[#000000]/10 backdrop-blur-sm bb-modal-backdrop" onClick={() => setShowAddEmployeeModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 rounded-t-[32px] w-full max-h-[85vh] overflow-y-auto bg-[#fdfcf0] shadow-2xl bb-sheet-panel md:relative md:rounded-3xl md:max-w-sm md:max-h-none md:translate-y-0 p-6 max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[#000000] border border-[#000000]/5">
            <div className="w-12 h-1.5 bg-[#000000]/10 rounded-full mx-auto mb-6 md:hidden" />
            <h3 className="text-xl font-normal text-[#000000] mb-4 uppercase tracking-tight">เพิ่มพนักงานใหม่</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-normal uppercase tracking-wider text-[#000000]/70 ml-1">ชื่อ</label>
                <input
                  autoFocus
                  type="text"
                  value={newEmployeeName}
                  onChange={e => setNewEmployeeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                  placeholder="กรอกชื่อพนักงาน"
                  className="w-full h-11 bg-[#fdfcf0]/50 border border-[#000000]/10 rounded-xl px-4 py-3 text-base md:text-[14px] text-[#000000] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="flex-1 h-11 md:h-auto md:py-3 text-[#000000]/60 font-normal hover:bg-[#000000]/5 rounded-xl transition-all text-base md:text-sm cursor-pointer"
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
          </div>
        </div>
      )}

      {showRegularHolidayModal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center md:items-center p-0 md:p-4">
          <div className="absolute inset-0 bg-[#000000]/10 backdrop-blur-sm bb-modal-backdrop" onClick={() => setShowRegularHolidayModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 rounded-t-[32px] w-full max-h-[85vh] overflow-y-auto bg-[#fdfcf0] shadow-2xl bb-sheet-panel md:relative md:rounded-3xl md:max-w-3xl md:max-h-none md:translate-y-0 p-6 max-md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[#000000] border border-[#000000]/5">
            <div className="w-12 h-1.5 bg-[#000000]/10 rounded-full mx-auto mb-6 md:hidden" />
            <h3 className="text-xl font-normal text-[#000000] mb-6 uppercase tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#000000]/40" />
              จัดการวันหยุดประจำ
            </h3>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left Column: Form */}
              <div className="flex flex-col w-full md:w-[260px] shrink-0">
                <div className="flex-1 flex flex-col space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-normal uppercase tracking-wider text-[#000000]/70 ml-1">พนักงาน</label>
                    <div className="relative">
                      <select
                        className="w-full h-11 px-4 pr-10 rounded-3xl border border-[#000000]/10 bg-[#fdfcf0] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer text-base md:text-[14px] font-normal appearance-none text-[#000000]"
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
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#000000]/40">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  
                  {holidayFormEmployee && (
                    <div className="space-y-2.5">
                      <label className="text-[13px] font-normal uppercase tracking-wider text-[#000000]/70 ml-1">เลือกวันหยุดประจำสัปดาห์</label>
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
                                  : 'bg-[#fdfcf0] border border-[#000000]/10 text-[#000000] hover:bg-[#000000]/5'
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

                <div className="pt-4 border-t border-[#000000]/5 mt-6 space-y-3">
                  {holidaySaveSuccess && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 flex items-center justify-center gap-2 animate-in fade-in duration-300">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-[13px] text-emerald-700 font-normal">บันทึกข้อมูลสำเร็จนะคะ</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRegularHolidayModal(false)}
                      className="flex-1 h-11 md:h-auto md:py-3 text-[#000000]/60 font-normal hover:bg-[#000000]/5 rounded-xl transition-all text-base md:text-sm cursor-pointer"
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

              {/* Right Column: Summary Table */}
              <div className="flex-1 w-full h-full overflow-x-auto border border-[#000000]/5 rounded-3xl p-4 bg-[#fdfcf0]/50 hidden md:block">
                <h4 className="text-[14px] font-normal text-[#000000] mb-3 px-1">สรุปวันหยุดประจำของพนักงาน</h4>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#000000]/5 text-[12px] text-[#000000]/60 uppercase tracking-widest">
                      <th className="py-2 px-2 font-normal">พนักงาน</th>
                      <th className="py-2 px-2 font-normal">วันหยุดประจำ</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px] text-[#000000]">
                    {profiles.map(p => {
                      const days = regularHolidays[p.id] || [];
                      if (days.length === 0) return null;
                      const dayLabels = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
                      
                      const sortedDays = [...days].sort((a,b) => (a===0?7:a) - (b===0?7:b)); 
                      
                      return (
                        <tr key={p.id} className="border-b border-[#000000]/5 last:border-0 hover:bg-[#000000]/5 transition-colors">
                          <td className="py-2 px-2 font-normal">{p.full_name}</td>
                          <td className="py-2 px-2 font-normal">
                            {sortedDays.map(d => dayLabels[d]).join(', ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastAlert && (
        <FloatingAlert
          message={toastAlert.message}
          onDismiss={() => setToastAlert(null)}
          style={{
            top: `${toastAlert.y - 45}px`,
            left: `${toastAlert.x}px`,
            transform: 'translateX(-50%)',
          }}
        />
      )}
    </div>
  );
}