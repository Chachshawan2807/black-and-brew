'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSecretaryBoard, type SecretaryBoard } from '@/app/actions/home-actions';
import {
  readCachedSecretaryBoard,
  writeCachedSecretaryBoard,
} from '@/lib/secretary/home-board-cache';
import HomeClient from '../HomeClient';
import { HomePageLoadingSkeleton } from './HomePageLoadingSkeleton';

const SESSION_POLL_MS = 150;
const SESSION_POLL_MAX_ATTEMPTS = 20;

type HomeClientAuthBootstrapProps = {
  locale: string;
};

function isUnauthorizedBoardError(error?: string): boolean {
  if (!error) return true;
  return error.toLowerCase().includes('unauthorized');
}

/** Loads home board on the client when RSC auth cookies are not ready yet (common on PWA resume). */
export function HomeClientAuthBootstrap({ locale }: HomeClientAuthBootstrapProps) {
  const [board, setBoard] = useState<SecretaryBoard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadInFlightRef = useRef(false);
  const boardRef = useRef(board);
  boardRef.current = board;

  const tryLoadBoard = useCallback(async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoadError(null);

    try {
      for (let attempt = 0; attempt < SESSION_POLL_MAX_ATTEMPTS; attempt += 1) {
        const result = await loadSecretaryBoard({ locale });
        if (result.success && result.board) {
          writeCachedSecretaryBoard(result.board);
          setBoard(result.board);
          return;
        }

        if (!isUnauthorizedBoardError(result.error)) {
          if (!boardRef.current) {
            setLoadError(result.error ?? 'ไม่สามารถโหลดงานได้');
          }
          return;
        }

        if (attempt < SESSION_POLL_MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, SESSION_POLL_MS));
        }
      }

      if (!boardRef.current) {
        setLoadError('ไม่สามารถโหลดงานได้');
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
    const cached = readCachedSecretaryBoard(locale);
    if (cached) {
      setBoard(cached);
    }
    void tryLoadBoard();
  }, [locale, tryLoadBoard]);

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
    return <HomeClient initialBoard={board} locale={locale} />;
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
