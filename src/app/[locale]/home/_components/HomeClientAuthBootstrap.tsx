'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAuthSessionInfo } from '@/app/actions/auth';
import { loadSecretaryBoard, type SecretaryBoard } from '@/app/actions/home-actions';
import { isClientAuthVerified } from '@/lib/client-auth-storage';
import HomeClient from '../HomeClient';
import { HomePageLoadingSkeleton } from './HomePageLoadingSkeleton';

const SESSION_POLL_MS = 400;
const SESSION_POLL_MAX_ATTEMPTS = 12;

type HomeClientAuthBootstrapProps = {
  locale: string;
};

/** Loads home board on the client when RSC auth cookies are not ready yet (common on PWA resume). */
export function HomeClientAuthBootstrap({ locale }: HomeClientAuthBootstrapProps) {
  const [board, setBoard] = useState<SecretaryBoard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadInFlightRef = useRef(false);

  const tryLoadBoard = useCallback(async () => {
    if (loadInFlightRef.current || board) return;
    loadInFlightRef.current = true;
    setLoadError(null);

    try {
      for (let attempt = 0; attempt < SESSION_POLL_MAX_ATTEMPTS; attempt += 1) {
        if (!isClientAuthVerified() && attempt > 0) {
          break;
        }

        const session = await getAuthSessionInfo();
        if (session.verified) {
          const result = await loadSecretaryBoard({ locale });
          if (result.success && result.board) {
            setBoard(result.board);
            return;
          }
          setLoadError(result.error ?? 'ไม่สามารถโหลดงานได้');
          return;
        }

        if (attempt < SESSION_POLL_MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, SESSION_POLL_MS));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ไม่สามารถโหลดงานได้';
      setLoadError(message);
    } finally {
      loadInFlightRef.current = false;
    }
  }, [board, locale]);

  useEffect(() => {
    void tryLoadBoard();
  }, [tryLoadBoard]);

  useEffect(() => {
    const onAuthenticated = () => {
      void tryLoadBoard();
    };
    window.addEventListener('bb-pin-authenticated', onAuthenticated);
    return () => window.removeEventListener('bb-pin-authenticated', onAuthenticated);
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
