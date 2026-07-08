'use client';

import dynamic from 'next/dynamic';
import type { SalesMetrics } from '@/app/actions/sales-actions';
import type { ChartColors } from '@/lib/chart-theme';

type TooltipPayload = { name: string; value: number; color: string };

export type SalesTopProductsChartProps = {
  topProducts: SalesMetrics['topProducts'];
  chartColors: ChartColors;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
};

function CustomTooltip({
  active,
  payload,
  label,
  formatCurrency,
  formatNumber,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card p-4 rounded-2xl bb-shadow-md border border-border">
        <p className="text-sm font-medium text-foreground/80 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{' '}
            {entry.name.includes('รายได้') || entry.name.includes('ยอดขาย')
              ? `฿${formatCurrency(entry.value)}`
              : formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

const SalesTopProductsChartInner = dynamic(
  () => import('./SalesTopProductsChartInner'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full min-h-[240px] rounded-xl bg-muted/30 animate-pulse" />
    ),
  }
);

export default function SalesTopProductsChart(props: SalesTopProductsChartProps) {
  return <SalesTopProductsChartInner {...props} />;
}

export { CustomTooltip };
