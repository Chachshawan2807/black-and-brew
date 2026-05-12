'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Shift, Profile } from '../types';
import { CalendarDays, Users, Briefcase, CalendarX, TreePalm, Loader2, GripVertical } from 'lucide-react';
import { ClickableInput } from '@/components/ui/ClickableInput';
import { revalidateAppPaths } from '@/app/actions/shift-actions';
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
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card p-4 flex flex-col gap-4 bg-white select-none border border-gray-100 shadow-sm transition-all duration-300 ${isDragging ? 'cursor-grabbing ring-1 ring-blue-500 opacity-30' : 'cursor-grab hover:border-blue-400 hover:-translate-y-[2px] hover:shadow-xl'}`}
      {...attributes}
      {...listeners}
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
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-normal text-[#14532d]">{data.workDays}</span>
          <span className="text-[11px] text-[#14532d] uppercase tracking-widest font-normal opacity-80">Work</span>
        </div>



        <div className="bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-normal text-[#7f1d1d]">{data.leaveDays}</span>
          <span className="text-[11px] text-[#7f1d1d] uppercase tracking-widest font-normal opacity-80">Leave</span>
        </div>

        <div className="bg-[#f0f9ff] border border-[#e0f2fe] rounded-xl p-2.5 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-normal text-[#0c4a6e]">{data.publicHolidays}</span>
          <span className="text-[11px] text-[#0c4a6e] uppercase tracking-widest font-normal opacity-80">Hol.</span>
        </div>


      </div>
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
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDateChange = (start: string, end: string) => {
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

      // Optimized Parallel Sync with Supabase
      if (newOrder.length > 0) {
        try {
          const updates = newOrder.map((id, index) => 
            supabase.from('profiles').update({ dashboard_order: index }).eq('id', id)
          );
          await Promise.all(updates);
          await revalidateAppPaths();
        } catch (error) {
          // silently handle error
        }
      }
    }
    setActiveId(null);
  };

  const activeProfileData = performanceData.find(d => d.profile.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 glass-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
            <CalendarDays className="w-5 h-5 text-blue-500" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-0.5"></p>
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

        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg w-fit shadow-sm">
          <Users className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
          <span className="text-lg font-normal text-[#000000]">{profiles.length}</span>
          <span className="text-xs text-gray-500 ml-1 uppercase tracking-wider">All Staff</span>
        </div>

      </div>


      {mounted ? (
        <DndContext
          id="dashboard-dnd"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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
            duration: 250,
            easing: 'ease-in-out',
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.3' } },
            }),
          }}>
            {activeId && activeProfileData ? (
              <div className="glass-card p-5 flex flex-col gap-4 bg-white shadow-2xl border border-blue-100 scale-105 opacity-100 ring-2 ring-blue-500 rounded-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {activeProfileData.profile.avatar_url ? (
                      <img src={activeProfileData.profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-200 shrink-0">
                        <span className="text-xl text-gray-400 font-normal">{activeProfileData.profile.full_name[0]}</span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-[17px] font-normal tracking-tight text-[#333333] leading-tight">
                        {activeProfileData.profile.full_name}
                      </h3>
                    </div>
                  </div>
                  <GripVertical className="w-5 h-5 text-gray-300" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#f0f9f1] border border-[#e0f2f1] rounded-3xl p-3 flex flex-col items-center justify-center text-center">
                    <Briefcase className="w-4 h-4 text-[#2e7d32] mb-1.5" />
                    <span className="text-xl font-normal text-[#2e7d32]">{activeProfileData.workDays}</span>
                  </div>
                  <div className="bg-[#fff1f2] border border-[#ffe4e6] rounded-3xl p-3 flex flex-col items-center justify-center text-center">
                    <CalendarX className="w-4 h-4 text-[#e11d48] mb-1.5" />
                    <span className="text-xl font-normal text-[#e11d48]">{activeProfileData.leaveDays}</span>
                  </div>
                  <div className="bg-[#f0f9ff] border border-[#e0f2fe] rounded-3xl p-3 flex flex-col items-center justify-center text-center">
                    <TreePalm className="w-4 h-4 text-[#0284c7] mb-1.5" />
                    <span className="text-xl font-normal text-[#0284c7]">{activeProfileData.publicHolidays}</span>
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