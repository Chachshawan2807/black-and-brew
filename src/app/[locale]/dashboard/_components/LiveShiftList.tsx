'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listRowSpring, SNAPPY_SPRING, CARD_LIFT_HOVER, CARD_PRESS_TAP } from '@/lib/motion-presets';
import { Shift, Profile } from '../types';
import { CalendarDays, Users, GripVertical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useShiftRealtime } from '@/hooks/use-shift-realtime';
import { toZonedTime } from 'date-fns-tz';
import { updateDashboardOrder } from '@/app/actions/shift-actions';
import { useRouter } from 'next/navigation';
import { format, parseISO, isValid, isWithinInterval } from 'date-fns';
import { ClickableDateRangePicker } from '@/components/ui/ClickableDateRangePicker';
import { SortableDragHandle } from '@/components/ui/sortable-drag-handle';
import {
  DndContext,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useSafeDndSensors } from '@/lib/dnd-sensors';
import {
  restrictToWindowEdges,
  snapCenterToCursor,
} from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { DASHBOARD_STAT_COLORS } from '@/lib/shift-colors';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';

interface PerformanceData {
  profile: Profile;
  workDays: number;
  leaveDays: number;
  publicHolidays: number;
}

// --- Sub-component: SortableEmployeeCard ---
interface SortableEmployeeCardProps {
  id: string;
  data: PerformanceData;
  isDragging?: boolean;
  isReadOnly?: boolean;
}

function SortableEmployeeCard({ id, data, isDragging, isReadOnly = false }: SortableEmployeeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 250ms cubic-bezier(0.2, 0, 0, 1)',
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-0 z-0" : "z-10 relative"}
      aria-label={`สถิติสะสม: ${data.profile.full_name} — ทำงาน ${data.workDays} วัน, ลา ${data.leaveDays} วัน, นักขัตฯ ${data.publicHolidays} วัน`}
    >
      <motion.div
        initial={listRowSpring.initial}
        animate={listRowSpring.animate}
        whileHover={isReadOnly ? undefined : CARD_LIFT_HOVER}
        transition={listRowSpring.transition}
        className={`p-6 flex flex-col gap-5 bg-card select-none border border-border bb-shadow-sm bb-transition rounded-3xl ${isReadOnly ? 'opacity-60 pointer-events-none' : 'hover:bg-muted/30 bb-shadow-hover-md'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 py-1">
            <h3 className="text-[19px] font-normal tracking-tight text-foreground leading-[1.6] truncate">
              {data.profile.full_name}
            </h3>
          </div>
          <SortableDragHandle
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            disabled={isReadOnly}
            iconClassName="w-5 h-5"
          />
        </div>

        <motion.div
          whileTap={isReadOnly ? undefined : CARD_PRESS_TAP}
          transition={SNAPPY_SPRING}
          className="grid grid-cols-3 gap-3"
        >
          <div className={`${DASHBOARD_STAT_COLORS.work} rounded-3xl p-3 flex flex-col items-center justify-center text-center transition-all hover:brightness-95`}>
            <span className="text-[22px] font-normal text-[#000000]">{data.workDays}</span>
            <span className="text-[12px] text-[#000000] uppercase tracking-widest font-normal mt-0.5">ทำงาน</span>
          </div>
          <div className={`${DASHBOARD_STAT_COLORS.leave} rounded-3xl p-3 flex flex-col items-center justify-center text-center transition-all hover:brightness-95`}>
            <span className="text-[22px] font-normal text-[#000000]">{data.leaveDays}</span>
            <span className="text-[12px] text-[#000000] uppercase tracking-widest font-normal mt-0.5">ลา</span>
          </div>
          <div className={`${DASHBOARD_STAT_COLORS.holiday} rounded-3xl p-3 flex flex-col items-center justify-center text-center transition-all hover:brightness-95`}>
            <span className="text-[22px] font-normal text-[#000000]">{data.publicHolidays}</span>
            <span className="text-[12px] text-[#000000] uppercase tracking-widest font-normal mt-0.5">นักขัตฯ</span>
          </div>
        </motion.div>
      </motion.div>
    </article>
  );
}

interface LiveShiftListProps {
  initialProfiles: Profile[];
  initialShifts: Shift[];
  initialHolidays: { id?: string; date: string; name?: string }[];
  startDate: string;
  endDate: string;
}

export default function LiveShiftList({
  initialProfiles,
  initialShifts,
  initialHolidays,
  startDate,
  endDate
}: LiveShiftListProps) {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [holidays, setHolidays] = useState<{ id?: string; date: string; name?: string }[]>(initialHolidays);
  const [orderedProfileIds, setOrderedProfileIds] = useState<string[]>(initialProfiles.map(p => p.id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  const refreshShiftsForRange = useCallback(async () => {
    const { data, error } = await supabase
      .from('shifts')
      .select('id, employee_id, start_time, end_time, status, metadata')
      .gte('start_time', `${startDate}T00:00:00`)
      .lte('start_time', `${endDate}T23:59:59`);
    if (error) {
      console.error('Supabase Error (LiveShiftList refresh):', error.message, error.details);
      return;
    }
    if (data) setShifts(data as Shift[]);
  }, [startDate, endDate]);

  useShiftRealtime({
    onShiftsChange: () => {
      void refreshShiftsForRange();
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const checkIsWorking = (profileId: string) => {
    const s = shifts.find(s => s.employee_id === profileId && s.status === 'scheduled');
    if (!s) return false;
    return isWithinInterval(toZonedTime(now, 'Asia/Bangkok'), { start: toZonedTime(parseISO(s.start_time), 'Asia/Bangkok'), end: toZonedTime(parseISO(s.end_time), 'Asia/Bangkok') });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only mount gate for date-dependent UI
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server-fetched props when parent revalidates
    setShifts(initialShifts);
    setProfiles(initialProfiles);
    setHolidays(initialHolidays);
    setOrderedProfileIds(initialProfiles.map(p => p.id));
  }, [initialShifts, initialProfiles, initialHolidays]);

  const sensors = useSafeDndSensors();

  const handleDateChange = (start: string, end: string) => {
    document.cookie = `dashboard_start_date=${start}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `dashboard_end_date=${end}; path=/; max-age=31536000; SameSite=Lax`;
    router.push(`?start=${start}&end=${end}`);
  };

  const performanceData = useMemo(() => {
    const holidaySet = new Set(holidays.map(h => h.date));
    const scheduledByEmployee = new Map<string, Shift[]>();
    const leaveCountByEmployee = new Map<string, number>();

    for (const s of shifts) {
      const employeeId = typeof s.employee_id === 'string' ? s.employee_id : null;
      if (!employeeId) continue;
      if (s.status === 'scheduled') {
        const list = scheduledByEmployee.get(employeeId) ?? [];
        list.push(s);
        scheduledByEmployee.set(employeeId, list);
      } else if (s.status === 'on_leave') {
        leaveCountByEmployee.set(employeeId, (leaveCountByEmployee.get(employeeId) ?? 0) + 1);
      }
    }

    const data = profiles.map(profile => {
      const employeeShifts = scheduledByEmployee.get(profile.id) ?? [];
      const leaveDays = leaveCountByEmployee.get(profile.id) ?? 0;
      let publicHolidaysCount = 0;
      for (const s of employeeShifts) {
        const shiftDate = s.start_time.split('T')[0];
        if (holidaySet.has(shiftDate)) publicHolidaysCount++;
      }
      const normalWorkDays = employeeShifts.length - publicHolidaysCount;
      const workDays = normalWorkDays + publicHolidaysCount;

      return { profile, workDays, leaveDays, publicHolidays: publicHolidaysCount };
    });

    if (orderedProfileIds.length > 0) {
      const orderIndex = new Map(orderedProfileIds.map((id, idx) => [id, idx]));
      return [...data].sort((a, b) => {
        const indexA = orderIndex.get(a.profile.id) ?? -1;
        const indexB = orderIndex.get(b.profile.id) ?? -1;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return data;
  }, [profiles, shifts, orderedProfileIds, holidays]);

  const handleDragStart = (event: DragStartEvent) => {
    if (isReadOnly) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isReadOnly) {
      setActiveId(null);
      return;
    }
    const { active, over } = event;
    if (over && active.id !== over.id) {
      let newOrder: string[] = [];
      setOrderedProfileIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        newOrder = arrayMove(items, oldIndex, newIndex);
        return newOrder;
      });

      if (newOrder.length > 0) {
        try {
          const result = await updateDashboardOrder(newOrder);
          if (!result.success) throw new Error(result.error);
        } catch (error) {
          console.error('[Dashboard] Order Sync failed:', error);
        }
      }
    }
    setActiveId(null);
  };

  const activeProfileData = performanceData.find(d => d.profile.id === activeId);

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 md:p-5 bg-card border border-border rounded-3xl bb-shadow-sm mb-6">
        
        {/* แผงควบคุมฝั่งซ้าย: ไอคอน และ Double Capsule Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 w-full">
            <div className="p-3 rounded-2xl bg-muted shrink-0 hidden sm:flex">
              <CalendarDays className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            
            <ClickableDateRangePicker
              startValue={startDate}
              endValue={endDate}
              onChange={({ start, end }) => handleDateChange(start, end)}
              containerClassName="w-full"
            />
          </div>
        </div>

        {/* แผงควบคุมฝั่งขวา: จำนวนพนักงาน */}
        <div className="flex items-center gap-3 px-5 h-11 bg-muted rounded-2xl w-fit">
          <Users className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="text-lg font-normal text-foreground">{profiles.length}</span>
          <span className="text-[13px] text-muted-foreground/80 ml-1 uppercase tracking-widest font-normal">พนักงานทั้งหมด</span>
        </div>
      </div>

      {/* ส่วน DND Context สำหรับแสดงพนักงาน */}
      {mounted ? (
        <DndContext
          id="dashboard-dnd"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[snapCenterToCursor, restrictToWindowEdges]}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 relative">
            <SortableContext items={orderedProfileIds} strategy={rectSortingStrategy}>
              {performanceData.map((data) => (
                <SortableEmployeeCard key={data.profile.id} id={data.profile.id} data={data} isReadOnly={isReadOnly} />
              ))}
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={{
            duration: 300,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
          }}>
            {activeId && activeProfileData ? (
              <div className="p-6 flex flex-col gap-5 bg-card bb-shadow-lg border border-border scale-105 opacity-100 ring-2 ring-border rounded-3xl pointer-events-none">
                <div className="flex items-center justify-between">
                  <div className="flex-1 py-1">
                    <h3 className="text-[19px] font-normal tracking-tight text-foreground leading-[1.6]">
                      {activeProfileData.profile.full_name}
                    </h3>
                  </div>
                  <div className="p-1 rounded-md bg-muted">
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`${DASHBOARD_STAT_COLORS.work} rounded-3xl p-3 flex flex-col items-center justify-center text-center`}>
                    <span className="text-[22px] font-normal text-[#000000]">{activeProfileData.workDays}</span>
                    <span className="text-[12px] text-[#000000]/80 uppercase tracking-widest font-normal mt-0.5">ทำงาน</span>
                  </div>
                  <div className={`${DASHBOARD_STAT_COLORS.leave} rounded-3xl p-3 flex flex-col items-center justify-center text-center`}>
                    <span className="text-[22px] font-normal text-[#000000]">{activeProfileData.leaveDays}</span>
                    <span className="text-[12px] text-[#000000]/80 uppercase tracking-widest font-normal mt-0.5">ลา</span>
                  </div>
                  <div className={`${DASHBOARD_STAT_COLORS.holiday} rounded-3xl p-3 flex flex-col items-center justify-center text-center`}>
                    <span className="text-[22px] font-normal text-[#000000]">{activeProfileData.publicHolidays}</span>
                    <span className="text-[12px] text-[#000000]/80 uppercase tracking-widest font-normal mt-0.5">นักขัตฯ</span>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 relative opacity-50">
          {performanceData.map((data) => (
            <SortableEmployeeCard key={data.profile.id} id={data.profile.id} data={data} isReadOnly={isReadOnly} />
          ))}
        </div>
      )}
    </div>
  );
}