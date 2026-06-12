export type ChartColors = {
  tick: string;
  grid: string;
  bar: string;
  cursor: string;
};

/** Theme-aware Recharts axis/grid/bar/cursor colors */
export function getChartColors(isDark: boolean): ChartColors {
  if (isDark) {
    return {
      tick: 'rgba(242, 241, 230, 0.55)',
      grid: 'rgba(242, 241, 230, 0.08)',
      bar: '#d4d3c8',
      cursor: 'rgba(242, 241, 230, 0.06)',
    };
  }

  return {
    tick: 'rgba(0, 0, 0, 0.55)',
    grid: 'rgba(0, 0, 0, 0.06)',
    bar: '#000000',
    cursor: 'rgba(0, 0, 0, 0.04)',
  };
}
