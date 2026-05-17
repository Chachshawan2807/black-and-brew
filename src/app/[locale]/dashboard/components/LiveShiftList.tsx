'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Shift, Profile } from '../types';
import { CalendarDays, Users, Briefcase, CalendarX, TreePalm, Loader2, GripVertical } from 'lucide-react';
import { ClickableInput } from '@/components/ui/ClickableInput';
import { revalidateAppPaths, updateDashboardOrder } from '@/app/actions/shift-actions';
import { useRouter } from 'next/navigation';
import { startOfWeek, addDays, format } from 'date-fns';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import {
  restrictToWindowEdges,
  snapCenterToCursor,
} from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';

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
}

function SortableEmployeeCard({ id, data, isDragging }: SortableEmployeeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : transition || 'transform 250ms cubic-bezier(0.2, 0, 0, 1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-0 z-0" : "z-10 relative"}
      {...attributes}
      {...listeners}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2, ease: "easeOut" } }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 1
        }}
        className="glass-card p-6 flex flex-col gap-5 bg-white/80 backdrop-blur-xl select-none border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow duration-300 hover:border-black/10 hover:shadow-xl rounded-3xl"
      >
        {/* Employee Info */}
        <div className="flex items-center justify-between">
          <div className="flex-1 py-1">
            <h3 className="text-[19px] font-normal tracking-tight text-[#000000] leading-[1.6] truncate">
              {data.profile.full_name}
            </h3>
          </div>

          <div className="p-1 rounded-md hover:bg-gray-100 transition-colors">
            <GripVertical className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-3xl p-3 flex flex-col items-center justify-center text-center transition-all hover:bg-[#dcfce7]">
            <span className="text-[22px] font-normal text-[#000000]">{data.workDays}</span>
            <span className="text-[12px] text-[#000000]/80 uppercase tracking-widest font-normal mt-0.5">ทำงาน</span>
          </div>

          <div className="bg-[#fff5f5] border border-[#fee2e2] rounded-3xl p-3 flex flex-col items-center justify-center text-center transition-all hover:bg-[#fee2e2]">
            <span className="text-[22px] font-normal text-[#000000]">{data.leaveDays}</span>
            <span className="text-[12px] text-[#000000]/80 uppercase tracking-widest font-normal mt-0.5">ลา</span>
          </div>

          <div className="bg-[#fffaf0] border border-[#ffedd5] rounded-3xl p-3 flex flex-col items-center justify-center text-center transition-all hover:bg-[#ffedd5]">
            <span className="text-[22px] font-normal text-[#000000]">{data.publicHolidays}</span>
            <span className="text-[12px] text-[#000000]/80 uppercase tracking-widest font-normal mt-0.5">นักขัตฯ</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface LiveShiftListProps {
  initialProfiles: Profile[];
  initialShifts: Shift[];
  initialHolidays: any[];
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
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [holidays, setHolidays] = useState<any[]>(initialHolidays);
  const [orderedProfileIds, setOrderedProfileIds] = useState<string[]>(initialProfiles.map(p => p.id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with props when they change (e.g. after revalidatePath or URL change)

  useEffect(() => {
    setShifts(initialShifts);
    setProfiles(initialProfiles);
    setHolidays(initialHolidays);
    setOrderedProfileIds(initialProfiles.map(p => p.id));
  }, [initialShifts, initialProfiles, initialHolidays]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDateChange = (start: string, end: string) => {
    // บันทึกวันที่เก็บไว้ใน Cookie มีอายุยาวนาน 1 ปี (Max-Age)
    document.cookie = `dashboard_start_date=${start}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `dashboard_end_date=${end}; path=/; max-age=31536000; SameSite=Lax`;
    
    router.push(`?start=${start}&end=${end}`);
  };



  // Performance Data
  const performanceData = useMemo(() => {
    const data = profiles.map(profile => {
      const employeeShifts = shifts.filter(s => s.employee_id === profile.id && s.status === 'scheduled');
      const leaveDays = shifts.filter(s => s.employee_id === profile.id && s.status === 'on_leave').length;

      // Separate shifts into Holiday and Normal work
      let normalWorkDays = 0;
      let publicHolidaysCount = 0;

      employeeShifts.forEach(s => {
        const shiftDate = s.start_time.split('T')[0];
        const isHoliday = holidays.some(h => h.date === shiftDate);
        if (isHoliday) {
          publicHolidaysCount++;
        } else {
          normalWorkDays++;
        }
      });

      // NEW LOGIC: The 1+1 Rule
      // WORK: All shifts (normal + holiday)
      // HOL.: Only shifts on public holidays
      const workDays = normalWorkDays + publicHolidaysCount;
      const publicHolidaysCount_final = publicHolidaysCount;

      return {
        profile,
        workDays,
        leaveDays,
        publicHolidays: publicHolidaysCount_final
      };

    });

    if (orderedProfileIds.length > 0) {
      return [...data].sort((a, b) => {
        const indexA = orderedProfileIds.indexOf(a.profile.id);
        const indexB = orderedProfileIds.indexOf(b.profile.id);
        // Put new employees (not in order list) at the end
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }

    return data;
  }, [profiles, shifts, orderedProfileIds]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      let newOrder: string[] = [];
      setOrderedProfileIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        newOrder = arrayMove(items, oldIndex, newIndex);
        return newOrder;
      });

      // Optimized Parallel Sync with Server Action (Service Role)
      if (newOrder.length > 0) {
        try {
          const result = await updateDashboardOrder(newOrder);
          if (!result.success) throw new Error(result.error);
        } catch (error) {
          console.error('[Dashboard] Order Sync failed:', error);
          // Optional: handle rollback if critical
        }
      }
    }
    setActiveId(null);
  };

  const activeProfileData = performanceData.find(d => d.profile.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 bg-white/80 backdrop-blur-xl border border-black/5 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-black/5">
            <CalendarDays className="w-5 h-5 text-black/60" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[13px] text-gray-500 uppercase tracking-widest mb-0.5"></p>
            <div className="flex items-center gap-2 justify-center">
              <ClickableInput
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value, endDate)}
                containerClassName="w-[130px] scale-90 origin-center"
              />
              <span className="text-[#000000] text-sm font-normal opacity-40 px-1">—</span>
              <ClickableInput
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange(startDate, e.target.value)}
                containerClassName="w-[130px] scale-90 origin-center"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-2.5 bg-black/5 rounded-2xl w-fit">
          <Users className="w-4 h-4 text-black/60" strokeWidth={1.5} />
          <span className="text-lg font-normal text-[#000000]">{profiles.length}</span>
          <span className="text-[13px] text-[#000000]/40 ml-1 uppercase tracking-widest font-normal">พนักงานทั้งหมด</span>
        </div>

      </div>

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
            <SortableContext
              items={orderedProfileIds}
              strategy={rectSortingStrategy}
            >
              {performanceData.map((data) => (
                <SortableEmployeeCard
                  key={data.profile.id}
                  id={data.profile.id}
                  data={data}
                />
              ))}
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={{
            duration: 300,
            easing: 'cubic-bezier(0.2, 0, 0, 1)',
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.4' } },
            }),
          }}>
            {activeId && activeProfileData ? (
              <div className="glass-card p-6 flex flex-col gap-5 bg-white/95 shadow-2xl border border-black/10 scale-105 opacity-100 ring-2 ring-black/5 rounded-3xl backdrop-blur-xl pointer-events-none">
                <div className="flex items-center justify-between">
                  <div className="flex-1 py-1">
                    <h3 className="text-[19px] font-normal tracking-tight text-[#000000] leading-[1.6]">
                      {activeProfileData.profile.full_name}
                    </h3>
                  </div>
                  <div className="p-1 rounded-md bg-gray-100">
                    <GripVertical className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-3xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[22px] font-normal text-[#000000]">{activeProfileData.workDays}</span>
                    <span className="text-[12px] text-[#000000]/80 uppercase tracking-widest font-normal mt-0.5">ทำงาน</span>
                  </div>
                  <div className="bg-[#fff5f5] border border-[#fee2e2] rounded-3xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[22px] font-normal text-[#000000]">{activeProfileData.leaveDays}</span>
                    <span className="text-[12px] text-[#000000]/80 uppercase tracking-widest font-normal mt-0.5">ลา</span>
                  </div>
                  <div className="bg-[#fffaf0] border border-[#ffedd5] rounded-3xl p-3 flex flex-col items-center justify-center text-center">
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
            <SortableEmployeeCard
              key={data.profile.id}
              id={data.profile.id}
              data={data}
            />
          ))}
        </div>
      )}

    </div>
  );
}