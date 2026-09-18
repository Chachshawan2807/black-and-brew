import type { HomeShiftProfile } from '@/lib/schedule/home-shift-status';
import type { ClientShiftRow } from '@/lib/schedule/client-shift-queries';

/** Serializable home "สมาชิกวันนี้" payload (SSR, actions, client). */
export type HomeMemberPanelSnapshot = {
  dateIso: string;
  profiles: HomeShiftProfile[];
  shifts: ClientShiftRow[];
};
