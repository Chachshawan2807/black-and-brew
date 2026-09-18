/** Responsive schedule day card grid: max 2 columns on narrow viewports (Baseline mobile). */
export function resolveScheduleBoardGridClass(itemCount: number): string {
  if (itemCount <= 1) return 'grid-cols-1 w-fit max-w-[8.25rem]';
  if (itemCount === 2) return 'grid-cols-2';
  if (itemCount === 3) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
}
