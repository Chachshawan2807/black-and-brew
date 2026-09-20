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
    maintenanceTasks: snapshot.maintenanceTasks,
    operational: snapshot.operational,
    headcountToday: snapshot.headcountToday,
    isBranch2Day: snapshot.isBranch2Day,
    branch2Remark: snapshot.branch2Remark,
  };
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
    if (board) writeCachedSecretaryBoard(board);
    return board;
  } catch {
    return null;
  }
}

export function writeCachedSecretaryBoard(board: SecretaryBoard): void {
  const snapshotPatch = snapshotToCachePatch(board);
  const payload: CachedHomeBoard = {
    locale: board.snapshot.locale,
    dateIso: board.snapshot.dateIso,
    tasks: board.tasks,
    ...(snapshotPatch ? { snapshotPatch } : {}),
  };
  writeRaw(BOARD_CACHE_KEY, JSON.stringify(payload));
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
