'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { scheduleSupabaseChannelTeardown } from '@/lib/supabase-realtime-channel';
import { fetchHomeMaintenanceTasks } from '@/lib/maintenance/fetch-home-maintenance';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';

const BANGKOK_TZ = 'Asia/Bangkok';
const REFRESH_DEBOUNCE_MS = 250;

function bangkokIsoDate(now = new Date()): string {
  return format(toZonedTime(now, BANGKOK_TZ), 'yyyy-MM-dd');
}

/**
 * Keeps home "due within 1 month" tasks in sync with service_records changes.
 * Starts from RSC props, then refreshes on realtime + tab visibility.
 */
export function useHomeMaintenanceTasks(initialTasks: UpcomingMaintenanceTask[]) {
  const [tasks, setTasks] = useState(initialTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let teardownCancel: (() => void) | null = null;

    const stopChannel = () => {
      if (!channel) return;
      const activeChannel = channel;
      channel = null;
      teardownCancel?.();
      teardownCancel = scheduleSupabaseChannelTeardown(activeChannel, {
        shouldTeardown: () => channel === null,
      });
    };

    const refresh = async () => {
      try {
        await ensureSupabaseSession();
        const next = await fetchHomeMaintenanceTasks(bangkokIsoDate());
        if (!cancelled) setTasks(next);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Supabase Error:', message);
      }
    };

    const scheduleRefresh = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    void (async () => {
      await ensureSupabaseSession();
      if (cancelled) return;

      channel = supabase
        .channel('bb-home-service-records')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'service_records' },
          () => {
            scheduleRefresh();
          },
        )
        .subscribe();

      if (cancelled) {
        stopChannel();
        return;
      }

      // Soft navigations / stale RSC props: recompute once on mount.
      scheduleRefresh();
    })();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      teardownCancel?.();
      teardownCancel = null;
      stopChannel();
    };
  }, []);

  return tasks;
}
