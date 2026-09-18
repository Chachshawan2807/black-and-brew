import type { HomeShiftProfile } from '@/lib/schedule/home-shift-status';
import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';
import type {
  HomeDutySummary,
  HomeOffOrLeaveRow,
} from '@/lib/schedule/home-day-roster';

/** Serializable home "คนและกะวันนี้" payload (SSR, actions, client). */
export type HomeMemberPanelSnapshot = {
  dateIso: string;
  profiles: HomeShiftProfile[];
  shifts: ClientShiftRow[];
  leaveRows?: HomeOffOrLeaveRow[];
  dutySummary?: HomeDutySummary;
};
