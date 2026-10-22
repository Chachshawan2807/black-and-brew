export type EspressoShotSide = 'medium' | 'dark';
export type EspressoShotQuality = 'target' | 'fast' | 'slow';

export type EspressoShotRecord = {
  sequence: number;
  durationMs: number;
  completedAt: number;
};

export type EspressoShotSideState = {
  startedAt: number | null;
  lastDurationMs: number | null;
  completedCount: number;
  history: EspressoShotRecord[];
};

export type EspressoShotTimerState = Record<EspressoShotSide, EspressoShotSideState>;

export const ESPRESSO_SHOT_TIMER_STORAGE_KEY = 'black-and-brew.espresso-shot-timer.v1';

export function getEspressoShotQuality(
  side: EspressoShotSide,
  durationMs: number,
): EspressoShotQuality {
  const targetMs = side === 'medium' ? 27_000 : 25_000;
  const toleranceMs = 2_000;

  if (durationMs < targetMs - toleranceMs) return 'fast';
  if (durationMs > targetMs + toleranceMs) return 'slow';
  return 'target';
}

function createSideState(): EspressoShotSideState {
  return {
    startedAt: null,
    lastDurationMs: null,
    completedCount: 0,
    history: [],
  };
}

export function createEspressoShotTimerState(): EspressoShotTimerState {
  return {
    medium: createSideState(),
    dark: createSideState(),
  };
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseSideState(value: unknown): EspressoShotSideState {
  if (!value || typeof value !== 'object') return createSideState();
  const side = value as Partial<EspressoShotSideState>;
  const history = Array.isArray(side.history)
    ? side.history
        .filter(
          (record): record is EspressoShotRecord =>
            Boolean(record) &&
            typeof record === 'object' &&
            Number.isInteger(record.sequence) &&
            record.sequence > 0 &&
            isFiniteNonNegative(record.durationMs) &&
            isFiniteNonNegative(record.completedAt),
        )
        .slice(0, 5)
    : [];
  const largestSequence = history.reduce(
    (largest, record) => Math.max(largest, record.sequence),
    0,
  );

  return {
    startedAt: isFiniteNonNegative(side.startedAt) ? side.startedAt : null,
    lastDurationMs: isFiniteNonNegative(side.lastDurationMs) ? side.lastDurationMs : null,
    completedCount:
      typeof side.completedCount === 'number' && Number.isInteger(side.completedCount)
        ? Math.max(largestSequence, side.completedCount, 0)
        : largestSequence,
    history,
  };
}

export function readEspressoShotTimerState(serialized: string | null): EspressoShotTimerState {
  if (!serialized) return createEspressoShotTimerState();
  try {
    const value: unknown = JSON.parse(serialized);
    if (!value || typeof value !== 'object') return createEspressoShotTimerState();
    const state = value as Partial<EspressoShotTimerState>;
    return {
      medium: parseSideState(state.medium),
      dark: parseSideState(state.dark),
    };
  } catch {
    return createEspressoShotTimerState();
  }
}

export function toggleEspressoShotTimer(
  state: EspressoShotTimerState,
  side: EspressoShotSide,
  now: number,
): EspressoShotTimerState {
  const current = state[side];

  if (current.startedAt === null) {
    return {
      ...state,
      [side]: { ...current, startedAt: now, lastDurationMs: null },
    };
  }

  const durationMs = Math.max(0, now - current.startedAt);
  const completedCount = current.completedCount + 1;
  const record: EspressoShotRecord = {
    sequence: completedCount,
    durationMs,
    completedAt: now,
  };

  return {
    ...state,
    [side]: {
      startedAt: null,
      lastDurationMs: durationMs,
      completedCount,
      history: [record, ...current.history].slice(0, 5),
    },
  };
}

export function formatEspressoShotDuration(durationMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1_000);
  return String(totalSeconds).padStart(2, '0');
}
