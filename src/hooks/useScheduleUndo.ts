'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  batchUpdateProfileNames,
  revalidateAppPaths,
  updateStaffOrder,
} from '@/app/actions/shift-actions';
import type { Profile, Shift } from '@/types';

const MAX_HISTORY = 20;

export interface ScheduleHistorySnapshot {
  profiles: Profile[];
  orderedProfileIds: string[];
  shifts: Shift[];
}

interface UseScheduleUndoOptions {
  profiles: Profile[];
  orderedProfileIds: string[];
  shifts: Shift[];
  weekDays: string[];
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  setOrderedProfileIds: React.Dispatch<React.SetStateAction<string[]>>;
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  blockIfReadOnly: () => boolean;
}

async function syncSnapshotToDb(snapshot: ScheduleHistorySnapshot, weekDays: string[]) {
  await updateStaffOrder(snapshot.orderedProfileIds);
  await batchUpdateProfileNames(
    snapshot.profiles.map((p) => ({ id: p.id, full_name: p.full_name }))
  );
  await supabase
    .from('shifts')
    .delete()
    .gte('start_time', weekDays[0] + 'T00:00:00')
    .lte('start_time', weekDays[6] + 'T23:59:59');

  if (snapshot.shifts.length > 0) {
    await supabase.from('shifts').insert(
      snapshot.shifts.map(({ employee_id, start_time, end_time, status, metadata }) => ({
        employee_id,
        start_time,
        end_time,
        status,
        metadata,
      }))
    );
  }
  await revalidateAppPaths();
}

export function useScheduleUndo({
  profiles,
  orderedProfileIds,
  shifts,
  weekDays,
  setProfiles,
  setOrderedProfileIds,
  setShifts,
  blockIfReadOnly,
}: UseScheduleUndoOptions) {
  const [undoStack, setUndoStack] = useState<ScheduleHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<ScheduleHistorySnapshot[]>([]);

  const pushToHistory = useCallback(
    (currentProfiles: Profile[], currentOrder: string[], currentShifts: Shift[]) => {
      setUndoStack((prev) => {
        const newStack = [
          ...prev,
          {
            profiles: JSON.parse(JSON.stringify(currentProfiles)),
            orderedProfileIds: [...currentOrder],
            shifts: JSON.parse(JSON.stringify(currentShifts)),
          },
        ];
        return newStack.slice(-MAX_HISTORY);
      });
      setRedoStack([]);
    },
    []
  );

  const undo = useCallback(async () => {
    if (blockIfReadOnly()) return;
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack((prev) =>
      [
        {
          profiles: JSON.parse(JSON.stringify(profiles)),
          orderedProfileIds: [...orderedProfileIds],
          shifts: JSON.parse(JSON.stringify(shifts)),
        },
        ...prev,
      ].slice(0, MAX_HISTORY)
    );
    setUndoStack(newUndoStack);

    setProfiles(previous.profiles);
    setOrderedProfileIds(previous.orderedProfileIds);
    setShifts(previous.shifts);

    try {
      await syncSnapshotToDb(previous, weekDays);
    } catch {
      // preserve prior behavior: silent failure on sync
    }
  }, [
    blockIfReadOnly,
    undoStack,
    profiles,
    orderedProfileIds,
    shifts,
    weekDays,
    setProfiles,
    setOrderedProfileIds,
    setShifts,
  ]);

  const redo = useCallback(async () => {
    if (blockIfReadOnly()) return;
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setUndoStack((prev) =>
      [
        ...prev,
        {
          profiles: JSON.parse(JSON.stringify(profiles)),
          orderedProfileIds: [...orderedProfileIds],
          shifts: JSON.parse(JSON.stringify(shifts)),
        },
      ].slice(-MAX_HISTORY)
    );
    setRedoStack(newRedoStack);

    setProfiles(next.profiles);
    setOrderedProfileIds(next.orderedProfileIds);
    setShifts(next.shifts);

    try {
      await syncSnapshotToDb(next, weekDays);
    } catch {
      // preserve prior behavior: silent failure on sync
    }
  }, [
    blockIfReadOnly,
    redoStack,
    profiles,
    orderedProfileIds,
    shifts,
    weekDays,
    setProfiles,
    setOrderedProfileIds,
    setShifts,
  ]);

  return { undoStack, redoStack, pushToHistory, undo, redo };
}
