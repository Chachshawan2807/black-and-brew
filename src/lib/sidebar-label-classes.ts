import { cn } from '@/lib/utils';

/** Fade/slide sidebar text on desktop collapse — avoid `hidden` so CSS can animate out */
export function sidebarLabelClass(isOpen: boolean | undefined, extra?: string) {
  return cn(
    'bb-sidebar-label font-normal',
    extra,
    isOpen === false ? 'bb-sidebar-label--collapsed' : 'bb-sidebar-label--expanded',
  );
}
