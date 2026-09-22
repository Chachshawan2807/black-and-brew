import type { SecretaryBoard } from '@/app/actions/home-actions';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
import {
  buildMinimalSecretaryBoardSnapshot,
  isMinimalSecretaryBoardSnapshot,
} from '@/lib/secretary/minimal-board-snapshot';
import { mergeSecretarySnapshot } from '@/lib/secretary/snapshot-patch';
import type { SecretarySnapshotPatch } from '@/lib/secretary/snapshot-patch';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryTask } from '@/lib/secretary/types';

const BOARD_CACHE_KEY = 'bb-home-board:v3';
const LEGACY_BOARD_CACHE_KEY_V2 = 'bb-home-board:v2';
const LEGACY_BOARD_CACHE_KEY_V1 = 'bb-home-board:v1';
const MEMBER_PANEL_CACHE_KEY = 'bb-home-member-panel:v1';

type CachedHomeBoard = {
  locale: string;
  dateIso: string;
  tasks: SecretaryTask[];
  snapshotPatch?: SecretarySnapshotPatch;
};

type CachedHomeMemberPanel = {
  dateIso: string;
  panel: HomeMemberPanelSnapshot;
};

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function readRaw(key: string): string | null {
  try {
    if (canUseLocalStorage()) {
      const local = localStorage.getItem(key);
      if (local) return local;
    }
    if (canUseSessionStorage()) return sessionStorage.getItem(key);
    return null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    if (canUseLocalStorage()) localStorage.setItem(key, value);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function parseCachedBoard(raw: string, locale: string): SecretaryBoard | null {
  const parsed = JSON.parse(raw) as CachedHomeBoard;
  if (parsed.locale !== locale) return null;
  if (parsed.dateIso !== todayIsoBkk()) return null;
  if (!Array.isArray(parsed.tasks)) return null;

  const snapshot = buildMinimalSecretaryBoardSnapshot(parsed.dateIso, parsed.locale);
  return {
    snapshot: parsed.snapshotPatch
      ? mergeSecretarySnapshot(snapshot, parsed.snapshotPatch)
      : snapshot,
    tasks: parsed.tasks,
  };
}

function snapshotToCachePatch(board: SecretaryBoard): SecretarySnapshotPatch | undefined {
  if (isMinimalSecretaryBoardSnapshot(board.snapshot)) return undefined;
  const { snapshot } = board;
  return {
    dateIso: snapshot.dateIso,
    locale: snapshot.locale,
    itemsToOrder: snapshot.itemsToOrder,
    branchWithdrawItems: snapshot.branchWithdrawItems,
    inventoryCatalogItems: snapshot.inventoryCatalogItems,
    maintenanceTasks: snapshot.maintenanceTasks,
    operational: snapshot.operational,
    headcountToday: snapshot.headcountToday,
    isBranch2Day: snapshot.isBranch2Day,
    branch2Remark: snapshot.branch2Remark,
  };
}

function readSameDaySnapshotPatch(
  locale: string,
  dateIso: string,
): SecretarySnapshotPatch | undefined {
  try {
    const raw =
      readRaw(BOARD_CACHE_KEY) ??
      readRaw(LEGACY_BOARD_CACHE_KEY_V2) ??
      readRaw(LEGACY_BOARD_CACHE_KEY_V1);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedHomeBoard;
    if (parsed.locale !== locale || parsed.dateIso !== dateIso) return undefined;
    return parsed.snapshotPatch;
  } catch {
    return undefined;
  }
}

export function readCachedSecretaryBoard(locale: string): SecretaryBoard | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw =
      readRaw(BOARD_CACHE_KEY) ??
      readRaw(LEGACY_BOARD_CACHE_KEY_V2) ??
      readRaw(LEGACY_BOARD_CACHE_KEY_V1);
    if (!raw) return null;

    const board = parseCachedBoard(raw, locale);
    if (board) persistCachedSecretaryBoard(board, false);
    return board;
  } catch {
    return null;
  }
}

const secretaryBoardCacheListeners = new Set<() => void>();

type StableBoardCache = {
  locale: string;
  raw: string | null;
  board: SecretaryBoard | null;
};

let stableBoardCache: StableBoardCache | null = null;

function rememberBoardCache(locale: string, raw: string | null, board: SecretaryBoard | null): void {
  stableBoardCache = { locale, raw, board };
}

export function subscribeSecretaryBoardCache(listener: () => void): () => void {
  secretaryBoardCacheListeners.add(listener);
  return () => {
    secretaryBoardCacheListeners.delete(listener);
  };
}

/** Stable snapshot for `useSyncExternalStore`. Does not write storage. */
export function getCachedSecretaryBoardSnapshot(locale: string): SecretaryBoard | null {
  if (typeof window === 'undefined') return null;

  const raw =
    readRaw(BOARD_CACHE_KEY) ??
    readRaw(LEGACY_BOARD_CACHE_KEY_V2) ??
    readRaw(LEGACY_BOARD_CACHE_KEY_V1);

  if (stableBoardCache && stableBoardCache.locale === locale && stableBoardCache.raw === raw) {
    return stableBoardCache.board;
  }

  let board: SecretaryBoard | null = null;
  if (raw) {
    try {
      board = parseCachedBoard(raw, locale);
    } catch {
      board = null;
    }
  }

  rememberBoardCache(locale, raw, board);
  return board;
}

function persistCachedSecretaryBoard(board: SecretaryBoard, notify: boolean): void {
  const freshPatch = snapshotToCachePatch(board);
  const snapshotPatch =
    freshPatch ??
    (board.snapshot.detailStatus === 'ready'
      ? undefined
      : readSameDaySnapshotPatch(board.snapshot.locale, board.snapshot.dateIso));
  const payload: CachedHomeBoard = {
    locale: board.snapshot.locale,
    dateIso: board.snapshot.dateIso,
    tasks: board.tasks,
    ...(snapshotPatch ? { snapshotPatch } : {}),
  };
  const nextRaw = JSON.stringify(payload);
  const currentRaw = readRaw(BOARD_CACHE_KEY);
  if (currentRaw !== nextRaw) {
    writeRaw(BOARD_CACHE_KEY, nextRaw);
  }
  rememberBoardCache(board.snapshot.locale, nextRaw, board);
  if (!notify || currentRaw === nextRaw) return;
  secretaryBoardCacheListeners.forEach((listener) => listener());
}

export function writeCachedSecretaryBoard(board: SecretaryBoard): void {
  persistCachedSecretaryBoard(board, true);
}

export function readCachedHomeMemberPanel(dateIso: string): HomeMemberPanelSnapshot | null {
  if (typeof window === 'undefined') return null;
  if (dateIso !== todayIsoBkk()) return null;

  try {
    const raw = readRaw(MEMBER_PANEL_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedHomeMemberPanel;
    if (parsed.dateIso !== dateIso) return null;
    if (!parsed.panel || parsed.panel.dateIso !== dateIso) return null;
    return parsed.panel;
  } catch {
    return null;
  }
}

export function writeCachedHomeMemberPanel(panel: HomeMemberPanelSnapshot): void {
  if (panel.dateIso !== todayIsoBkk()) return;

  const payload: CachedHomeMemberPanel = {
    dateIso: panel.dateIso,
    panel,
  };
  writeRaw(MEMBER_PANEL_CACHE_KEY, JSON.stringify(payload));
}
