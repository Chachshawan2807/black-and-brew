'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
  peekScheduleOverlayData,
  prefetchScheduleOverlayData,
} from '@/lib/secretary/overlay-data-cache';
import type { ScheduleOverlayData } from '@/app/actions/secretary-overlay-actions';
import type { SecretaryTask } from '@/lib/secretary/types';
import SecretaryTaskSubwindow from './SecretaryTaskSubwindow';

const ScheduleClient = dynamic(() => import('@/app/[locale]/schedule/ScheduleClient'), {
  ssr: false,
});

type ScheduleOverlayProps = {
  task: SecretaryTask;
  locale: string;
  onClose: () => void;
};

export default function ScheduleOverlay({ task, locale, onClose }: ScheduleOverlayProps) {
  const [payload, setPayload] = useState<ScheduleOverlayData | null>(() => peekScheduleOverlayData());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void prefetchScheduleOverlayData().then((result) => {
      if (cancelled) return;
      if (!result.success || !result.data) {
        setLoadError(result.error ?? 'ไม่สามารถโหลดตารางงานได้');
        setPayload(null);
        return;
      }
      setPayload(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SecretaryTaskSubwindow title={task.title} onClose={onClose} maxWidthClass="max-w-6xl">
      {loadError ? (
        <p className="mb-2 text-center text-[13px] text-muted-foreground">{loadError}</p>
      ) : null}
      {!payload ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">กำลังโหลด...</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bb-smooth-scroll [scrollbar-width:thin]">
          <ScheduleClient
            initialProfiles={payload.initialProfiles}
            initialShifts={payload.initialShifts}
            initialHolidays={payload.initialHolidays}
            initialRegularHolidays={payload.initialRegularHolidays}
            initialDateStr={payload.initialDateStr}
            locale={locale}
            embedded
          />
        </div>
      )}
    </SecretaryTaskSubwindow>
  );
}
