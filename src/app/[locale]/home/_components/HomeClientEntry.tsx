'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkAuth } from '@/app/actions/auth';
import { loadHomeMemberPanel, loadSecretaryBoard, type SecretaryBoard } from '@/app/actions/home-actions';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import {
  homePerfStartSession,
  registerHomeBoardPerfDevTools,
} from '@/lib/perf/home-board-perf';
import {
  readCachedHomeMemberPanel,
  readCachedSecretaryBoard,
  writeCachedHomeMemberPanel,
  writeCachedSecretaryBoard,
} from '@/lib/secretary/home-board-cache';
import HomeClient from '../HomeClient';
import { HomePageLoadingSkeleton } from './HomePageLoadingSkeleton';

const PIN_WAIT_MS = 15_000;
const PIN_EVENT_MAX_AGE_MS = 2_000;

let lastPinEventAt = 0;

function rememberPinAuthenticated(): void {
  lastPinEventAt = Date.now();
}

function pinEventIsFresh(): boolean {
  return lastPinEventAt > 0 && Date.now() - lastPinEventAt < PIN_EVENT_MAX_AGE_MS;
}

if (typeof window !== 'undefined') {
  window.addEventListener('bb-pin-authenticated', rememberPinAuthenticated);
}

type HomeClientEntryProps = {
  locale: string;
};

type LoadBoardOptions = {
  skipPinWait?: boolean;
};

function isUnauthorizedBoardError(error?: string): boolean {
  if (!error) return true;
  return error.toLowerCase().includes('unauthorized');
}

async function waitForPinReadAccess(): Promise<boolean> {
  if (pinEventIsFresh()) return true;

  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.removeEventListener('bb-pin-authenticated', onPinAuthenticated);
      resolve(value);
    };

    const onPinAuthenticated = () => {
      finish(true);
    };

    const timeout = window.setTimeout(() => {
      finish(false);
    }, PIN_WAIT_MS);

    window.addEventListener('bb-pin-authenticated', onPinAuthenticated);

    void checkAuth().then((ok) => {
      if (ok || pinEventIsFresh()) finish(true);
    });
  });
}

function applyMemberPanel(
  boardDate: string,
  panel: HomeMemberPanelSnapshot | undefined,
  setMemberPanel: (panel: HomeMemberPanelSnapshot) => void,
): void {
  if (!panel) return;
  if (panel.dateIso !== boardDate) return;
  writeCachedHomeMemberPanel(panel);
  setMemberPanel(panel);
}

/** Client fallback when server auth or board is still pending; uses same-day cache for instant paint. */
export function HomeClientEntry({ locale }: HomeClientEntryProps) {
  const boardFromCacheOnInitRef = useRef(false);
  const [board, setBoard] = useState<SecretaryBoard | null>(() => {
    const cached = readCachedSecretaryBoard(locale);
    boardFromCacheOnInitRef.current = cached !== null;
    return cached;
  });
  const [memberPanel, setMemberPanel] = useState<HomeMemberPanelSnapshot | undefined>(
    () => {
      const cachedBoard = readCachedSecretaryBoard(locale);
      if (!cachedBoard) return undefined;
      return readCachedHomeMemberPanel(cachedBoard.snapshot.dateIso) ?? undefined;
    },
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadInFlightRef = useRef(false);
  const boardRef = useRef(board);
  boardRef.current = board;

  const tryLoadBoard = useCallback(async (opts?: LoadBoardOptions) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoadError(null);

    try {
      if (!opts?.skipPinWait) {
        const authed = await waitForPinReadAccess();
        if (!authed) {
          if (!boardRef.current) {
            setLoadError('ไม่สามารถโหลดงานได้');
          }
          return;
        }
      }

      const [result, memberResult] = await Promise.all([
        loadSecretaryBoard({ locale }),
        loadHomeMemberPanel(),
      ]);
      if (result.success && result.board) {
        writeCachedSecretaryBoard(result.board);
        setBoard(result.board);
        const boardDate = result.board.snapshot.dateIso;
        if (memberResult.success && memberResult.panel) {
          if (memberResult.panel.dateIso === boardDate) {
            applyMemberPanel(boardDate, memberResult.panel, setMemberPanel);
          } else {
            const aligned = await loadHomeMemberPanel({ dateIso: boardDate });
            if (aligned.success && aligned.panel) {
              applyMemberPanel(boardDate, aligned.panel, setMemberPanel);
            }
          }
        } else {
          const cachedPanel = readCachedHomeMemberPanel(boardDate);
          if (cachedPanel) setMemberPanel(cachedPanel);
        }
        return;
      }

      if (isUnauthorizedBoardError(result.error) && opts?.skipPinWait) {
        const authed = await waitForPinReadAccess();
        if (!authed) return;
        const [retryResult, retryMember] = await Promise.all([
          loadSecretaryBoard({ locale }),
          loadHomeMemberPanel(),
        ]);
        if (retryResult.success && retryResult.board) {
          writeCachedSecretaryBoard(retryResult.board);
          setBoard(retryResult.board);
          applyMemberPanel(
            retryResult.board.snapshot.dateIso,
            retryMember.success ? retryMember.panel : undefined,
            setMemberPanel,
          );
        }
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
      void tryLoadBoard({ skipPinWait: Boolean(boardRef.current) });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [tryLoadBoard]);

  if (board) {
    return (
      <HomeClient
        initialBoard={board}
        initialMemberPanel={memberPanel}
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
