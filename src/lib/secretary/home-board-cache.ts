import { buildMinimalSecretaryBoardSnapshot } from '@/lib/secretary/minimal-board-snapshot';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryBoard } from '@/app/actions/home-actions';
import type { SecretaryTask } from '@/lib/secretary/types';

const CACHE_KEY = 'bb-home-board:v1';

type CachedHomeBoard = {
  locale: string;
  dateIso: string;
  tasks: SecretaryTask[];
};

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function readCachedSecretaryBoard(locale: string): SecretaryBoard | null {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedHomeBoard;
    if (parsed.locale !== locale) return null;
    if (parsed.dateIso !== todayIsoBkk()) return null;
    if (!Array.isArray(parsed.tasks)) return null;

    return {
      snapshot: buildMinimalSecretaryBoardSnapshot(parsed.dateIso, parsed.locale),
      tasks: parsed.tasks,
    };
  } catch {
    return null;
  }
}

export function writeCachedSecretaryBoard(board: SecretaryBoard): void {
  if (!canUseSessionStorage()) return;

  try {
    const payload: CachedHomeBoard = {
      locale: board.snapshot.locale,
      dateIso: board.snapshot.dateIso,
      tasks: board.tasks,
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode failures.
  }
}
