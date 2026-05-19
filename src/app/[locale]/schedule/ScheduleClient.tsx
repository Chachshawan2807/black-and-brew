'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Plus, Trash2, Undo2, Redo2, UserCog, AlertTriangle, Loader2, ChevronDown, X, Calendar, CalendarDays, Download } from 'lucide-react';
import { startOfWeek, addDays, format } from 'date-fns';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ClickableDatePicker } from '@/components/ui/ClickableDatePicker';

import { deleteShift, revalidateAppPaths, updateStaffOrder, saveShift } from '@/app/actions/shift-actions';
import type { Profile, Shift } from '@/types';
import { isSameThaiDay } from '@/lib/date-utils';

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  restrictToWindowEdges,
  snapCenterToCursor,
} from '@dnd-kit/modifiers';
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
}

const SortableEmployeeRow = React.memo(({
  id, profile, weekDays, shifts, shiftTypes, onCellClick,
  editingNameId, nameInput, setNameInput, onNameClick, onSaveName, onDeleteEmployee
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
      <div className="p-2 border-r border-[#000000]/5 flex items-center gap-2 bg-[#fdfcf0] sticky left-0 z-[5]">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-3 hover:bg-gray-100 rounded-3xl transition-all text-gray-300 hover:text-gray-600 touch-none flex items-center justify-center"
          title="ลากเพื่อเปลี่ยนลำดับ"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1 py-1">
          {editingNameId === id ? (
            <input
              autoFocus
              className="w-full bg-white border border-blue-400 text-[16px] font-normal text-black px-1 rounded outline-none"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => onSaveName(id)}
              onKeyDown={(e) => e.key === 'Enter' && onSaveName(id)}
            />
          ) : (
            <span
              onClick={() => onNameClick(id, profile.full_name)}
              className="text-[16px] font-normal text-[#000000] truncate leading-[1.6] tracking-tight cursor-text hover:text-blue-600 transition-colors block"
            >
              {profile.full_name}
            </span>
          )}
        </div>
        <button
          onClick={() => onDeleteEmployee(id)}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
          title="ลบพนักงานถาวร"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {weekDays.map(date => {
        const shift = shifts.find(s => (s.employee_id === profile.id || (s as any).profile_id === profile.id) && isSameThaiDay(s.start_time, date));
        const type = shiftTypes.find(t => t.value === shift?.metadata?.location);
        return (
          <div
            key={date}
            onClick={(e) => onCellClick(profile.id, date, shift, e.clientX, e.clientY)}
            className="p-1 border-r last:border-0 border-gray-50 min-h-[52px] cursor-pointer group/cell relative"
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
  initialDateStr: string;
  locale: string;
}

export default function ScheduleClient({
  initialProfiles,
  initialShifts,
  initialHolidays,
  initialDateStr,
  locale
}: ScheduleClientProps) {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date(initialDateStr));
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [holidays, setHolidays] = useState<any[]>(initialHolidays);
  const [orderedProfileIds, setOrderedProfileIds] = useState<string[]>(initialProfiles.map(p => p.id));
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string; shift?: any; x: number; y: number } | null>(null);

  const [editingHoliday, setEditingHoliday] = useState<string | null>(null);
  const [holidayInput, setHolidayInput] = useState('');

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Leave & Shift Management System
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [managementForm, setManagementForm] = useState({
    employeeId: '',
    shiftType: '6:30',
    startDate: '',
    endDate: '',
    remark: ''
  });

  const mgmtStartRef = useRef<HTMLInputElement>(null);
  const mgmtEndRef = useRef<HTMLInputElement>(null);

  const histStartRef = useRef<HTMLInputElement>(null);
  const histEndRef = useRef<HTMLInputElement>(null);

  // History Panel State
  const [mgmtHistory, setMgmtHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState({ start: '', end: '' });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Undo/Redo System
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date(currentDate), { weekStartsOn: 1 });
    return [...Array(7)].map((_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
  }, [currentDate]);

  const copyInputRef = useRef<HTMLInputElement>(null);

  // Sync with server props
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShifts(initialShifts);
    setProfiles(initialProfiles);
    setHolidays(initialHolidays);
    setOrderedProfileIds(initialProfiles.map(p => p.id));
    setCurrentDate(new Date(initialDateStr));
  }, [initialShifts, initialProfiles, initialHolidays, initialDateStr]);

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
      // Use updateStaffOrder Server Action with Service Role
      await updateStaffOrder(previous.orderedProfileIds);

      // Name updates still use client-side if allowed by RLS, but for stability we standardise
      const profileUpdates = previous.profiles.map((p: any) =>
        supabase.from('profiles').update({ full_name: p.full_name }).eq('id', p.id)
      );
      await Promise.all(profileUpdates);
      await supabase.from('shifts').delete().gte('start_time', weekDays[0] + 'T00:00:00').lte('start_time', weekDays[6] + 'T23:59:59');

      if (previous.shifts.length > 0) {
        await supabase.from('shifts').insert(previous.shifts.map((s: any) => {
          const { id, created_at, ...rest } = s; // Cleanup internal fields
          return rest;
        }));
      }
      await revalidateAppPaths();
      router.refresh();
    } catch {
      // Failed to undo
    }
  };

  const redo = async () => {
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
      // Use updateStaffOrder Server Action with Service Role
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
      router.refresh();
    } catch {
      // Failed to redo, silently ignore or handle error
    }
  };

  const handleClearAll = async () => {
    pushToHistory(profiles, orderedProfileIds, shifts);
    try {
      await supabase.from('shifts').delete().gte('start_time', weekDays[0] + 'T00:00:00').lte('start_time', weekDays[6] + 'T23:59:59');
      setShowClearConfirm(false);
      await revalidateAppPaths();
      router.refresh();
    } catch {
      alert('ไม่สามารถลบข้อมูลได้ โปรดลองอีกครั้ง');
    }
  };

  const fetchMgmtHistory = useCallback(async () => {
    try {
      // Fetch shifts with is_management: true in metadata
      // Note: We'll fetch a reasonable range or all
      let query = supabase.from('shifts')
        .select(`*, profiles(full_name)`)
        .eq('metadata->is_management', true)
        .order('start_time', { ascending: false });

      if (historyFilter.start) query = query.gte('start_time', historyFilter.start + 'T00:00:00');
      if (historyFilter.end) query = query.lte('start_time', historyFilter.end + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;

      // Group contiguous shifts into ranges
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
            employee_name: shift.profiles?.full_name || 'Unknown',
            location: shift.metadata?.location,
            remark: shift.metadata?.remark,
            startDate: shift.start_time,
            endDate: shift.start_time,
            color: shiftTypes.find(t => t.value === shift.metadata?.location)?.color || 'bg-white',
            metadata: { ...shift.metadata }
          });
        }
      });

      setMgmtHistory(grouped.reverse()); // Show newest first
    } catch {
      // Silently handle error to prevent data leakage
    }
  }, [historyFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (showManagementModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMgmtHistory();
    }
  }, [showManagementModal, fetchMgmtHistory]);

  const handleSaveManagement = async () => {
    if (!managementForm.employeeId || !managementForm.startDate || !managementForm.endDate) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน (พนักงาน, วันเริ่มต้น, วันสิ้นสุด)');
      return;
    }

    setLoading(true);
    pushToHistory(profiles, orderedProfileIds, shifts);

    try {
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

      // Delete existing for this employee in range
      if (datesToDelete.length > 0) {
        const { error: delError } = await supabase.from('shifts')
          .delete()
          .eq('employee_id', managementForm.employeeId)
          .in('start_time', datesToDelete);
        if (delError) throw delError;
      }

      // Insert new
      if (newShifts.length > 0) {
        const { error: insError } = await supabase.from('shifts')
          .insert(newShifts);
        if (insError) throw insError;
      }

      // Success Feedback & Refresh
      setSaveSuccess(true);
      fetchMgmtHistory();
      setTimeout(() => setSaveSuccess(false), 3000);

      // Reset form but stay open
      setManagementForm({ employeeId: '', shiftType: '6:30', startDate: '', endDate: '', remark: '' });

      await revalidateAppPaths();
      router.refresh();

    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyShifts = async (sourceDateStr: string) => {
    if (!sourceDateStr) return;
    setLoading(true);

    try {
      // 1. Calculate source week boundaries (Monday start)
      const sourceMonday = startOfWeek(new Date(sourceDateStr), { weekStartsOn: 1 });
      const sourceSunday = addDays(sourceMonday, 6);

      // 2. Fetch source shifts from Supabase
      const { data: sourceShifts, error: fetchError } = await supabase.from('shifts')
        .select('id, employee_id, start_time, end_time, status, metadata')
        .gte('start_time', format(sourceMonday, 'yyyy-MM-dd') + 'T00:00:00')
        .lte('start_time', format(sourceSunday, 'yyyy-MM-dd') + 'T23:59:59')
        .not('status', 'is', null)
        .not('status', 'eq', '')
        .not('metadata->>location', 'is', null)
        .not('metadata->>location', 'eq', '');

      if (fetchError) throw fetchError;
      if (!sourceShifts || sourceShifts.length === 0) {
        alert('ไม่พบข้อมูลกะงานในสัปดาห์ที่เลือก กรุณาเลือกสัปดาห์อื่นที่มีการลงเวลาไว้แล้ว');
        setLoading(false);
        return;
      }

      // Record for undo
      pushToHistory(profiles, orderedProfileIds, shifts);

      // 3. Delete all shifts in the current target week to prepare for copy
      const { error: deleteError } = await supabase.from('shifts')
        .delete()
        .gte('start_time', weekDays[0] + 'T00:00:00')
        .lte('start_time', weekDays[6] + 'T23:59:59');

      if (deleteError) throw deleteError;

      // 4. Map source shifts to current target week dates (Maintains same day-of-week)
      const newShifts = sourceShifts.map((s: any) => {
        const oldDate = new Date(s.start_time.split('T')[0]);
        // Day index: 0=Mon, 1=Tue, ..., 6=Sun
        const dayIndex = (oldDate.getDay() + 6) % 7;
        const targetDateStr = weekDays[dayIndex];

        return {
          employee_id: s.employee_id,
          start_time: targetDateStr + 'T00:00:00',
          end_time: targetDateStr + 'T23:59:59',
          status: s.status,
          metadata: s.metadata
        };
      });

      // 5. Batch Insert into Supabase
      if (newShifts.length > 0) {
        const { error: insertError } = await supabase.from('shifts').insert(newShifts);
        if (insertError) throw insertError;
      }

      // 6. Sync UI and Dashboard Stats
      revalidateAppPaths();
    } catch {
      alert('เกิดข้อผิดพลาดในการคัดลอกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const rollbackOrder = [...orderedProfileIds];
    const oldIndex = orderedProfileIds.indexOf(active.id as string);
    const newIndex = orderedProfileIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Zero Latency Local Update
      const newOrder = arrayMove(orderedProfileIds, oldIndex, newIndex);
      setOrderedProfileIds(newOrder);

      // Background Sync using Server Action (Service Role)
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
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้ถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้ และจะลบกะงานทั้งหมดที่เกี่ยวข้องด้วย')) return;

    setLoading(true);
    pushToHistory(profiles, orderedProfileIds, shifts); // Save state for undo just in case, though DB delete is permanent
    try {
      // 1. Delete all shifts for this employee to satisfy foreign key constraints
      await supabase.from('shifts').delete().eq('employee_id', employeeId);

      // 2. Delete the employee profile
      const { error } = await supabase.from('profiles').delete().eq('id', employeeId);
      if (error) throw error;

      // 3. Update UI State instantly (collapse the row)
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
    if (!newEmployeeName.trim()) return;

    setLoading(true);
    try {
      // Calculate next display order
      const nextOrder = profiles.length;

      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          full_name: newEmployeeName.trim(),
          display_order: nextOrder
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        // Optimistic UI Update: Update local state immediately
        const newProfile = data as Profile;
        setProfiles(prev => [...prev, newProfile]);
        setOrderedProfileIds(prev => [...prev, newProfile.id]);

        // Reset and close
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
    if (!nameInput.trim()) return setEditingNameId(null);
    pushToHistory(profiles, orderedProfileIds, shifts);
    try {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, full_name: nameInput } : p));
      setEditingNameId(null);
      await supabase.from('profiles').update({ full_name: nameInput }).eq('id', id);
      revalidateAppPaths(); // Fire and forget
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึกชื่อ');
    }
  };

  const handleSave = async (type: string) => {
    if (!selectedCell) return;
    const { employeeId, date, shift } = selectedCell;
    setSelectedCell(null);

    const isLeave = type === 'on_leave' || type === 'ลา';
    const payload = {
      employee_id: employeeId,
      start_time: date + 'T00:00:00',
      end_time: date + 'T23:59:59',
      status: (isLeave ? 'on_leave' : 'scheduled') as Shift['status'],
      metadata: { location: type }
    };

    setLoading(true);
    try {
      // 1. บันทึกข้อมูล
      const res = await saveShift(shift?.id ? { id: shift.id, ...payload } : payload);
      if (!res.success) throw new Error(res.error);

      // 2. หน่วงเวลาเล็กน้อยเพื่อให้ Database สลาย Latency (สำคัญมาก)
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. ขยายช่วงเวลา Fetch ให้กว้างขึ้น 1 วัน เพื่อแก้ปัญหา Timezone ตกขอบ
      const startRange = format(addDays(new Date(weekDays[0]), -1), 'yyyy-MM-dd');
      const endRange = format(addDays(new Date(weekDays[6]), 1), 'yyyy-MM-dd');

      const { data: updatedShifts, error: fetchError } = await supabase
        .from('shifts')
        .select('*')
        .gte('start_time', startRange + 'T00:00:00')
        .lte('start_time', endRange + 'T23:59:59');

      if (fetchError) throw fetchError;
      
      // อัปเดตข้อมูลใหม่ทั้งหมด
      setShifts(updatedShifts || []);
      
      // สั่ง Sync ผ่าน Server Action ล่าสุด
      await revalidateAppPaths();
      router.refresh();

    } catch (error) {
      console.error('[handleSave] Fatal Error:', error);
      alert('บันทึกข้อมูลเรียบร้อย แต่การอัปเดตหน้าจอขัดข้อง โปรดกดรีเฟรชหน้าจอ');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!selectedCell?.shift?.id) {
      setSelectedCell(null);
      return;
    }
    pushToHistory(profiles, orderedProfileIds, shifts);
    try {
      const shiftId = selectedCell.shift.id;
      setShifts(prev => prev.filter(s => s.id !== shiftId));
      setSelectedCell(null);

      const result = await deleteShift(shiftId);
      if (result.success) {
        revalidateAppPaths(); // Fire and forget
      } else {
        // Rollback on fail is complex, typically handled by full refresh, but we just alert
        alert('ลบข้อมูลไม่สำเร็จ: ' + result.error);
        router.refresh();
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      router.push(`?week=${e.target.value}`);
    }
  };

  const handleSaveHoliday = async (date: string) => {
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
      revalidateAppPaths(); // Fire and forget
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึกวันหยุด');
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
      alert('เกิดข้อผิดพลาดในการบันทึกตารางงานเป็นรูปภาพ');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  return (
    <div className="flex flex-col h-screen bg-transparent text-[#000000] overflow-hidden">
      <header className="h-14 border-b border-[#000000]/5 px-6 flex items-center justify-between bg-transparent shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className={`p-1.5 rounded-md transition-all duration-200 active:scale-95 ${undoStack.length > 0 ? 'hover:bg-gray-200 text-gray-800 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
              title="เลิกทำ"
            >
              <Undo2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className={`p-1.5 rounded-md transition-all duration-200 active:scale-95 ${redoStack.length > 0 ? 'hover:bg-gray-200 text-gray-800 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
              title="ทำซ้ำ"
            >
              <Redo2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManagementModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wide"
            >
              <UserCog className="w-3.5 h-3.5" />
              การลา/เปลี่ยนกะ
            </button>

            <div className="relative">
              <input
                ref={copyInputRef}
                type="date"
                className="sr-only"
                onChange={(e) => handleCopyShifts(e.target.value)}
              />
              <button
                onClick={() => copyInputRef.current?.showPicker()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wide"
              >
                <Plus className="w-3.5 h-3.5" />
                คัดลอกสัปดาห์ก่อนหน้า
              </button>
            </div>




            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-red-600 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wide"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ล้างทั้งหมด
            </button>

            <button
              onClick={exportScheduleImage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wide"
            >
              <Download className="w-3.5 h-3.5" />
              บันทึกรูปภาพ
            </button>

            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal text-black bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wide"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มพนักงาน
            </button>
          </div>

          <div className="flex items-center gap-6 pl-4">
            <ClickableDatePicker
              value={initialDateStr}
              onChange={handleDateChange}
              containerClassName="w-fit h-9 scale-100 origin-right"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 p-2 md:p-4 overflow-hidden flex flex-col bg-transparent">
        <div className="flex-1 flex flex-col bg-[#fdfcf0]/80 backdrop-blur-sm border border-[#000000]/5 rounded-3xl overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto overflow-x-auto">
            <div id="blackandbrew-schedule-table" className="min-w-[900px] bg-[#fdfcf0] h-fit flex flex-col">
              <div className="grid grid-cols-8 border-b border-[#000000]/5 bg-red-50/10 sticky top-0 z-[16]">
                <div className="p-2.5 border-r border-[#000000]/5 flex items-center justify-center bg-red-50/20">
                  <span className="text-[12px] text-[#991b1b] font-normal uppercase tracking-widest">นักขัตฤกษ์</span>
                </div>
                {weekDays.map(date => {
                  const holiday = holidays.find(h => h.date === date);
                  return (
                    <div
                      key={`holiday-${date}`}
                      onClick={() => { setEditingHoliday(date); setHolidayInput(holiday?.name || ''); }}
                      className="p-1 border-r last:border-0 border-[#000000]/5 flex items-center justify-center min-h-[38px] cursor-pointer hover:bg-red-50 transition-colors"
                    >
                      {editingHoliday === date ? (
                        <input
                          autoFocus
                          className="w-full h-full bg-white border border-red-200 text-[14px] text-[#7f1d1d] font-normal text-center rounded focus:outline-none ring-1 ring-red-400"
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

              <div className="grid grid-cols-8 bg-gray-100 border-b border-gray-200 shrink-0 sticky top-[38px] z-[15]">
                <div className="p-2.5 border-r border-gray-200 flex items-center justify-center bg-gray-100">
                  <span className="text-[13px] text-[#000000] font-normal uppercase tracking-widest">พนักงาน</span>
                </div>
                {weekDays.map((date) => {
                  const d = new Date(date);
                  const isToday = date === todayStr;
                  return (
                    <div key={date} className="p-1.5 flex flex-col items-center justify-center text-center border-r last:border-0 border-gray-200 transition-colors min-h-[50px] bg-gray-100">
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
                      />
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-8 border-t border-gray-200 bg-[#f5f5f5] sticky bottom-0">
                <div className="p-2 border-r border-gray-100 flex items-center justify-center bg-gray-50/30">
                  {/* Empty space - removed FOH label */}
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
                    <div key={`foh-${date}`} className={`p-1.5 border-r last:border-0 border-gray-100 flex items-center justify-center ${date === todayStr ? 'bg-blue-50/50' : ''}`}>
                      <span className={`text-[15px] font-normal ${fohCount > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{fohCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedCell && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="absolute bg-white/95 backdrop-blur-md border border-gray-200 w-48 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: `${Math.min(window.innerHeight - 300, selectedCell.y)}px`,
              left: `${Math.min(window.innerWidth - 200, selectedCell.x)}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2.5 border-b border-gray-50 bg-gray-50/50">
              <h2 className="text-[13px] font-normal text-gray-900 truncate">
                {profiles.find(p => p.id === selectedCell.employeeId)?.full_name}
              </h2>
            </div>
            <div className="p-1.5 grid gap-1">
              {shiftTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleSave(type.value)}
                  className={`py-1.5 px-3 rounded-lg border text-[12px] font-normal shadow-sm w-full text-left transition-all duration-200 cursor-pointer hover:brightness-95 hover:shadow-md active:scale-[0.97] ${type.color}`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            {selectedCell.shift && (
              <div className="p-1.5 bg-white border-t border-gray-50">
                <button
                  onClick={handleClear}
                  className="w-full py-1.5 rounded-lg bg-red-50 text-red-500 text-[11px] font-normal border border-red-100 hover:bg-red-500 hover:text-white transition-all duration-200 cursor-pointer active:scale-[0.97]"
                >
                  Clear Entry
                </button>
              </div>
            )}

          </div>
        </div>
      )}


      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowClearConfirm(false); }}>
          <div className="bg-white border border-gray-100 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-normal text-gray-900">ยืนยันการลบข้อมูล</h3>
            <p className="text-sm text-gray-500">คุณแน่ใจหรือไม่ที่จะลบข้อมูลกะงาน<br />ของสัปดาห์นี้ทั้งหมด</p>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-normal transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleClearAll}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-normal transition-colors cursor-pointer"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-normal text-blue-600 uppercase tracking-widest">กำลังดำเนินการ...</p>
        </div>
      )}
      {/* Management Modal */}
      {showManagementModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={(e) => { if (e.target === e.currentTarget) setShowManagementModal(false); }}
        >
          <div className="bg-[#fdfcf0] w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex max-h-[90vh]">
            {/* Left side: Management Form */}
            <div className="w-[320px] flex flex-col border-r border-[#000000]/5 shrink-0">
              <div className="p-5 border-b border-[#000000]/5 flex justify-between items-center bg-[#fdfcf0]/50">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-3xl">
                    <UserCog className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-normal text-[#000000] tracking-tight">การลา / เปลี่ยนกะ</h3>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Success Feedback Overlay (Mini) */}
                {saveSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white rotate-45" />
                    </div>
                    <p className="text-[13px] text-emerald-700 font-normal">บันทึกข้อมูลเรียบร้อยแล้ว</p>
                  </div>
                )}

                {/* Employee Selection */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-[#000000]/60 uppercase tracking-widest px-1">พนักงาน</label>
                  <div className="relative">
                    <select
                      className="w-full h-11 px-4 pr-10 rounded-3xl border border-[#000000]/5 bg-[#fdfcf0]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer text-[14px] font-normal appearance-none text-[#000000]"
                      value={managementForm.employeeId}
                      onChange={(e) => setManagementForm(prev => ({ ...prev, employeeId: e.target.value }))}
                    >
                      <option value="">เลือกพนักงาน...</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#4B5563]">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Shift/Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-[#000000]/60 uppercase tracking-widest px-1">กะงาน / ประเภทการลา</label>
                  <div className="relative group/select">
                    <select
                      className={`w-full h-11 px-4 pr-10 rounded-3xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer text-[14px] font-normal shadow-sm appearance-none text-[#000000] ${shiftTypes.find(t => t.value === managementForm.shiftType)?.color || 'bg-white border-[#000000]/5'
                        }`}
                      value={managementForm.shiftType}
                      onChange={(e) => setManagementForm(prev => ({ ...prev, shiftType: e.target.value }))}
                    >
                      {shiftTypes.map(t => (
                        <option
                          key={t.value}
                          value={t.value}
                          className="bg-white text-gray-900 font-normal py-2"
                        >
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 text-gray-900">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Smart Date Range Selector */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-[#000000]/60 uppercase tracking-widest px-1">ระบุช่วงวันที่จัดการ</label>
                  <div
                    className="group relative flex items-center h-12 px-4 rounded-3xl border border-[#000000]/5 bg-[#fdfcf0] hover:border-[#000000]/20 transition-all cursor-pointer overflow-hidden shadow-sm"
                    onClick={() => mgmtStartRef.current?.showPicker()}
                  >
                    <Calendar className="w-4 h-4 text-[#000000] mr-3 shrink-0" strokeWidth={1.5} />
                    <div className="flex-1 flex items-center gap-2 text-[13.5px] font-normal text-[#000000]">
                      <span>{managementForm.startDate ? format(new Date(managementForm.startDate), 'dd/MM/yyyy') : 'เริ่มต้น'}</span>
                      <span className="text-gray-300 mx-1">→</span>
                      <span>{managementForm.endDate ? format(new Date(managementForm.endDate), 'dd/MM/yyyy') : 'สิ้นสุด'}</span>
                    </div>

                    <input
                      ref={mgmtStartRef}
                      type="date"
                      className="sr-only"
                      value={managementForm.startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManagementForm(prev => ({ ...prev, startDate: val }));
                        if (val) setTimeout(() => mgmtEndRef.current?.showPicker(), 100);
                      }}
                    />
                    <input
                      ref={mgmtEndRef}
                      type="date"
                      className="sr-only"
                      value={managementForm.endDate}
                      onChange={(e) => setManagementForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Remark */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[13px] font-normal text-[#000000]/60 uppercase tracking-widest px-1">หมายเหตุ</label>
                  <textarea
                    placeholder="รายละเอียดเพิ่มเติม..."
                    className="w-full h-20 p-4 rounded-3xl border border-[#000000]/5 bg-[#fdfcf0]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-[13px] leading-relaxed font-normal text-[#000000]"
                    value={managementForm.remark}
                    onChange={(e) => setManagementForm(prev => ({ ...prev, remark: e.target.value }))}
                  />
                </div>
              </div>

              <div className="p-4 bg-[#fdfcf0] border-t border-[#000000]/5 flex gap-3">
                <button
                  onClick={() => setShowManagementModal(false)}
                  className="flex-1 py-3 rounded-3xl bg-transparent border border-[#000000]/10 text-[#000000]/60 font-normal text-[12px] hover:bg-[#000000]/5 transition-all active:scale-95 shadow-sm"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  onClick={handleSaveManagement}
                  className="flex-1 py-3 rounded-3xl bg-emerald-600 text-white font-normal text-[12px] shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </div>

            {/* Right side: History Panel */}
            <div className="flex-1 flex flex-col bg-[#fdfcf0]/30 min-w-0">
              <div className="p-5 border-b border-[#000000]/5 flex justify-between items-center bg-[#fdfcf0]">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-[#000000]/40" />
                  <h3 className="text-lg font-normal text-[#000000] tracking-tight">ประวัติการจัดการทั้งหมด</h3>
                </div>
                <button onClick={() => setShowManagementModal(false)} className="p-2 hover:bg-[#000000]/5 rounded-full text-[#000000]/40 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* History Filter */}
              <div className="p-4 border-b border-[#000000]/5 bg-[#fdfcf0]">
                <div
                  className="group relative flex items-center h-10 px-3 rounded-3xl border border-[#000000]/5 bg-[#fdfcf0]/30 hover:bg-[#fdfcf0] hover:border-[#000000]/20 transition-all cursor-pointer overflow-hidden"
                  onClick={() => histStartRef.current?.showPicker()}
                >
                  <Calendar className="w-3.5 h-3.5 text-gray-400 mr-2.5 shrink-0" />
                  <div className="flex-1 flex items-center gap-2 text-[12px] font-normal text-[#000000]">
                    <span>{historyFilter.start ? format(new Date(historyFilter.start), 'dd/MM/yyyy') : 'กรองตามวันที่...'}</span>
                    <span className="text-gray-300">→</span>
                    <span>{historyFilter.end ? format(new Date(historyFilter.end), 'dd/MM/yyyy') : 'ทั้งหมด'}</span>
                  </div>

                  {/* Hidden Native Date Pickers */}
                  <input
                    ref={histStartRef}
                    type="date"
                    className="sr-only"
                    value={historyFilter.start}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHistoryFilter(prev => ({ ...prev, start: val }));
                      if (val) setTimeout(() => histEndRef.current?.showPicker(), 100);
                    }}
                  />
                  <input
                    ref={histEndRef}
                    type="date"
                    className="sr-only"
                    value={historyFilter.end}
                    onChange={(e) => setHistoryFilter(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              {/* History List - Grid Layout */}
              <div className="flex-1 overflow-y-auto p-5">
                {mgmtHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#000000]/20 space-y-2">
                    <CalendarDays className="w-8 h-8" />
                    <p className="text-sm font-normal uppercase tracking-widest">ไม่พบประวัติการจัดการ</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {mgmtHistory.map((item) => (
                      <div key={item.id} className="bg-[#fdfcf0] rounded-3xl border border-[#000000]/5 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md group h-[130px] min-w-0">
                        <div className={`h-1 w-full ${item.color}`} />
                        <div className="p-3 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[13px] font-normal text-gray-900 truncate flex-1 pr-1">{item.employee_name}</p>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-normal ${item.color} border border-gray-100 shrink-0`}>
                              {item.location}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[12px] text-[#000000] mb-1.5">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{format(new Date(item.startDate), 'dd/MM/yyyy')}</span>
                            {item.startDate !== item.endDate && (
                              <>
                                <span className="text-gray-300">→</span>
                                <span>{format(new Date(item.endDate), 'dd/MM/yyyy')}</span>
                              </>
                            )}
                          </div>
                          {item.remark ? (
                            <p className="text-[12px] text-gray-400 bg-gray-50/50 p-2 rounded-lg leading-tight italic truncate line-clamp-2 mt-auto border border-gray-100">
                              &quot;{item.remark}&quot;
                            </p>
                          ) : (
                            <div className="flex-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setShowAddEmployeeModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300 p-8">
            <h3 className="text-xl font-normal text-black mb-4 uppercase tracking-tight">เพิ่มพนักงานใหม่</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-normal uppercase tracking-wider text-[#4B5563] ml-1">ชื่อ</label>
                <input
                  autoFocus
                  type="text"
                  value={newEmployeeName}
                  onChange={e => setNewEmployeeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                  placeholder="กรอกชื่อพนักงาน"
                  className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-4 py-3 text-[14px] text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="flex-1 py-3 text-gray-500 font-normal hover:bg-gray-100 rounded-xl transition-all text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddEmployee}
                  disabled={loading || !newEmployeeName.trim()}
                  className="flex-1 py-3 bg-black text-white font-normal rounded-xl hover:bg-gray-900 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
