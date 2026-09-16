'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkAuth } from '@/app/actions/auth';
import { loadSecretaryBoard, type SecretaryBoard } from '@/app/actions/home-actions';
import {
  homePerfStartSession,
  registerHomeBoardPerfDevTools,
} from '@/lib/perf/home-board-perf';
import {
  readCachedSecretaryBoard,
  writeCachedSecretaryBoard,
} from '@/lib/secretary/home-board-cache';
import HomeClient from '../HomeClient';
import { HomePageLoadingSkeleton } from './HomePageLoadingSkeleton';

const SESSION_POLL_MS = 150;
const SESSION_POLL_MAX_ATTEMPTS = 20;

type HomeClientEntryProps = {
  locale: string;
};

function isUnauthorizedBoardError(error?: string): boolean {
  if (!error) return true;
  return error.toLowerCase().includes('unauthorized');
}

async function waitForPinReadAccess(): Promise<boolean> {
  if (await checkAuth()) return true;

  return new Promise((resolve) => {
    let attempts = 0;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (pollTimer) clearTimeout(pollTimer);
      window.removeEventListener('bb-pin-authenticated', onPinAuthenticated);
    };

    const poll = async () => {
      if (await checkAuth()) {
        cleanup();
        resolve(true);
        return;
      }

      attempts += 1;
      if (attempts >= SESSION_POLL_MAX_ATTEMPTS) {
        cleanup();
        resolve(false);
        return;
      }

      pollTimer = setTimeout(() => {
        void poll();
      }, SESSION_POLL_MS);
    };

    const onPinAuthenticated = () => {
      void poll();
    };

    window.addEventListener('bb-pin-authenticated', onPinAuthenticated);
    pollTimer = setTimeout(() => {
      void poll();
    }, SESSION_POLL_MS);
  });
}

/** Client fallback when server auth or board is still pending; uses session cache for instant paint. */
export function HomeClientEntry({ locale }: HomeClientEntryProps) {
  const boardFromCacheOnInitRef = useRef(false);
  const [board, setBoard] = useState<SecretaryBoard | null>(() => {
    const cached = readCachedSecretaryBoard(locale);
    boardFromCacheOnInitRef.current = cached !== null;
    return cached;
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadInFlightRef = useRef(false);
  const boardRef = useRef(board);
  boardRef.current = board;

  const tryLoadBoard = useCallback(async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoadError(null);

    try {
      const authed = await waitForPinReadAccess();
      if (!authed) {
        if (!boardRef.current) {
          setLoadError('ไม่สามารถโหลดงานได้');
        }
        return;
      }

      const result = await loadSecretaryBoard({ locale });
      if (result.success && result.board) {
        writeCachedSecretaryBoard(result.board);
        setBoard(result.board);
        return;
      }

      if (!isUnauthorizedBoardError(result.error) && !boardRef.current) {
        setLoadError(result.error ?? 'ไม่สามารถโหลดงานได้');
      }
    } catch (error) {
      if (boardRef.current) return;
      const message = error instanceof Error ? error.message : 'ไม่สามารถโหลดงานได้';
      setLoadError(message);
    } finally {
      loadInFlightRef.current = false;
    }
  }, [locale]);

  useEffect(() => {
    registerHomeBoardPerfDevTools();
    homePerfStartSession('entry');
    void tryLoadBoard();
  }, [tryLoadBoard]);

  useEffect(() => {
    const onAuthenticated = () => {
      void tryLoadBoard();
    };
    window.addEventListener('bb-pin-authenticated', onAuthenticated);
    return () => window.removeEventListener('bb-pin-authenticated', onAuthenticated);
  }, [tryLoadBoard]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void tryLoadBoard();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tryLoadBoard]);

  if (board) {
    return (
      <HomeClient
        initialBoard={board}
        locale={locale}
        boardLoadSource={boardFromCacheOnInitRef.current ? 'session-cache' : 'client-fetch'}
      />
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-[14px] text-muted-foreground">
        ไม่สามารถโหลดงานได้: {loadError}
      </div>
    );
  }

  return <HomePageLoadingSkeleton />;
}
