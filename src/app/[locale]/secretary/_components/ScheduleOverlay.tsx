'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { peekScheduleOverlayData } from '@/lib/secretary/overlay-data-cache';
import {
  fetchScheduleOverlayWithTimeout,
  retryScheduleOverlayFetch,
} from '@/lib/secretary/schedule-overlay-fetch';
import type { ScheduleOverlayData } from '@/app/actions/secretary-overlay-actions';
import type { SecretaryTask } from '@/lib/secretary/types';
import { SecretaryOverlayErrorState } from './SecretaryOverlayErrorState';
import { SecretaryOverlayLoadingSkeleton } from './SecretaryOverlayLoadingSkeleton';
import SecretaryTaskSubwindow from './SecretaryTaskSubwindow';

const ScheduleClient = dynamic(() => import('@/app/[locale]/schedule/ScheduleClient'), {
  ssr: false,
  loading: () => <SecretaryOverlayLoadingSkeleton variant="embed" label="กำลังเปิดตารางงาน..." />,
});

type ScheduleOverlayProps = {
  task: SecretaryTask;
  locale: string;
  onClose: () => void;
};

export default function ScheduleOverlay({ task, locale, onClose }: ScheduleOverlayProps) {
  const [payload, setPayload] = useState<ScheduleOverlayData | null>(() => peekScheduleOverlayData());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => peekScheduleOverlayData() === null);
  const [fetchNonce, setFetchNonce] = useState(0);

  const loadSchedule = useCallback(async (cancelled: () => boolean) => {
    const cached = peekScheduleOverlayData();
    if (cached) {
      setPayload(cached);
      setLoadError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const result = await fetchScheduleOverlayWithTimeout();
    if (cancelled()) return;

    setLoading(false);
    if (!result.success || !result.data) {
      setLoadError(result.error ?? 'ไม่สามารถโหลดตารางงานได้');
      setPayload(null);
      return;
    }

    setPayload(result.data);
    setLoadError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadSchedule(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [fetchNonce, loadSchedule]);

  const handleRetry = () => {
    retryScheduleOverlayFetch();
    setPayload(null);
    setFetchNonce((nonce) => nonce + 1);
  };

  return (
    <SecretaryTaskSubwindow title={task.title} onClose={onClose} maxWidthClass="max-w-6xl">
      {loadError ? (
        <SecretaryOverlayErrorState message={loadError} onRetry={handleRetry} />
      ) : loading || !payload ? (
        <SecretaryOverlayLoadingSkeleton variant="embed" label="กำลังโหลดตารางงาน..." />
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
