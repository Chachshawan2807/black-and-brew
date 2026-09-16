export type HomeBoardLoadSource = 'ssr' | 'session-cache' | 'client-fetch';

export type HomeBoardPerfPhase =
  | 'session-start'
  | 'cached-board-painted'
  | 'minimal-board-ready'
  | 'board-ui-mounted'
  | 'full-sync-start'
  | 'full-sync-end';

const STORAGE_KEY = 'bb-home-perf';
const MARK_PREFIX = 'bb-home:';

let sessionStarted = false;

export function isHomeBoardPerfEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.location.search.includes('bb_home_perf=1')) return true;
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Enable from DevTools on device: localStorage.setItem('bb-home-perf','1') then reload home. */
export function enableHomeBoardPerf(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
    console.info('[bb-home-perf] enabled; reload /home to capture timings');
  } catch {
    // private mode
  }
}

function sessionStartMs(): number | null {
  const entry = performance.getEntriesByName(`${MARK_PREFIX}session-start`)[0];
  return entry ? entry.startTime : null;
}

function logPhase(phase: HomeBoardPerfPhase, detail?: Record<string, unknown>): void {
  const start = sessionStartMs();
  const elapsed = start === null ? null : Math.round(performance.now() - start);
  console.info('[bb-home-perf]', phase, elapsed === null ? '' : `@ ${elapsed}ms`, detail ?? '');
}

export function homePerfStartSession(route: 'entry' | 'ssr-direct'): void {
  if (!isHomeBoardPerfEnabled() || sessionStarted) return;
  sessionStarted = true;
  performance.mark(`${MARK_PREFIX}session-start`);
  logPhase('session-start', { route });
}

export function homePerfMark(
  phase: Exclude<HomeBoardPerfPhase, 'session-start'>,
  detail?: Record<string, unknown>,
): void {
  if (!isHomeBoardPerfEnabled()) return;
  performance.mark(`${MARK_PREFIX}${phase}`);
  logPhase(phase, detail);
}

export function homePerfOnBoardVisible(options: {
  taskCount: number;
  source: HomeBoardLoadSource;
}): void {
  if (!isHomeBoardPerfEnabled()) return;
  if (options.source === 'session-cache') {
    homePerfMark('cached-board-painted', options);
  } else if (options.source === 'client-fetch') {
    homePerfMark('minimal-board-ready', options);
  }
  homePerfMark('board-ui-mounted', options);
}

export function homePerfFullSyncStart(): void {
  if (!isHomeBoardPerfEnabled()) return;
  performance.mark(`${MARK_PREFIX}full-sync-start`);
  logPhase('full-sync-start');
}

export function homePerfFullSyncEnd(options: {
  ok: boolean;
  taskCount?: number;
  syncKind?: string;
}): void {
  if (!isHomeBoardPerfEnabled()) return;
  performance.mark(`${MARK_PREFIX}full-sync-end`);
  try {
    performance.measure(
      `${MARK_PREFIX}full-sync-duration`,
      `${MARK_PREFIX}full-sync-start`,
      `${MARK_PREFIX}full-sync-end`,
    );
  } catch {
    // start mark missing if sync was skipped
  }
  logPhase('full-sync-end', options);
  homePerfPrintSummary();
}

export function homePerfPrintSummary(): void {
  if (!isHomeBoardPerfEnabled()) return;

  const phases: HomeBoardPerfPhase[] = [
    'session-start',
    'cached-board-painted',
    'minimal-board-ready',
    'board-ui-mounted',
    'full-sync-start',
    'full-sync-end',
  ];

  const start = sessionStartMs();
  const rows = phases
    .map((phase) => {
      const entry = performance.getEntriesByName(`${MARK_PREFIX}${phase}`)[0];
      if (!entry) return null;
      const fromSession =
        start === null ? null : Math.round(entry.startTime - start);
      return {
        phase,
        msFromSessionStart: fromSession,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const fullSync = performance
    .getEntriesByName(`${MARK_PREFIX}full-sync-duration`)
    .at(-1);

  console.info('[bb-home-perf] summary (ms from session start)', rows);
  if (fullSync) {
    console.info('[bb-home-perf] full-sync wall time (ms)', Math.round(fullSync.duration));
  }
}

declare global {
  interface Window {
    bbHomePerf?: {
      enable: () => void;
      summary: () => void;
    };
  }
}

export function registerHomeBoardPerfDevTools(): void {
  if (typeof window === 'undefined') return;
  window.bbHomePerf = {
    enable: enableHomeBoardPerf,
    summary: homePerfPrintSummary,
  };
}
