'use client';

import { useCallback, useEffect, useRef, useState, startTransition } from 'react';
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
  const [boardFromCacheOnInit] = useState(
    () => readCachedSecretaryBoard(locale) !== null,
  );
  const [board, setBoard] = useState<SecretaryBoard | null>(() =>
    readCachedSecretaryBoard(locale),
  );
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

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const tryLoadBoard = useCallback(async (opts?: LoadBoardOptions) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;

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

      const boardPromise = loadSecretaryBoard({ locale });
      const panelPromise = loadHomeMemberPanel();
      const boardResult = await boardPromise;
      if (boardResult.success && boardResult.board) {
        writeCachedSecretaryBoard(boardResult.board);
        setLoadError(null);
        setBoard(boardResult.board);
        const boardDate = boardResult.board.snapshot.dateIso;
        void panelPromise.then(async (memberResult) => {
          if (memberResult.success && memberResult.panel) {
            if (memberResult.panel.dateIso === boardDate) {
              applyMemberPanel(boardDate, memberResult.panel, setMemberPanel);
              return;
            }
            const aligned = await loadHomeMemberPanel({ dateIso: boardDate });
            if (aligned.success && aligned.panel) {
              applyMemberPanel(boardDate, aligned.panel, setMemberPanel);
            }
            return;
          }
          const cachedPanel = readCachedHomeMemberPanel(boardDate);
          if (cachedPanel) setMemberPanel(cachedPanel);
        });
        return;
      }

      if (isUnauthorizedBoardError(boardResult.error) && opts?.skipPinWait) {
        const authed = await waitForPinReadAccess();
        if (!authed) return;
        const retryBoardPromise = loadSecretaryBoard({ locale });
        const retryPanelPromise = loadHomeMemberPanel();
        const retryResult = await retryBoardPromise;
        if (retryResult.success && retryResult.board) {
          const retryBoard = retryResult.board;
          writeCachedSecretaryBoard(retryBoard);
          setLoadError(null);
          setBoard(retryBoard);
          void retryPanelPromise.then((retryMember) => {
            applyMemberPanel(
              retryBoard.snapshot.dateIso,
              retryMember.success ? retryMember.panel : undefined,
              setMemberPanel,
            );
          });
        }
        return;
      }

      if (!isUnauthorizedBoardError(boardResult.error) && !boardRef.current) {
        setLoadError(boardResult.error ?? 'ไม่สามารถโหลดงานได้');
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
    startTransition(() => {
      void tryLoadBoard({ skipPinWait: boardFromCacheOnInit });
    });
  }, [boardFromCacheOnInit, tryLoadBoard]);

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
        boardLoadSource={boardFromCacheOnInit ? 'session-cache' : 'client-fetch'}
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
