'use client';

import React, { useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3, PieChart } from 'lucide-react';
import type { SalesSnapshot } from '@/app/actions/market-insights-types';
import MetricInfoTip from './MetricInfoTip';
import { fmtCurrency, fmtCurrencyCompact, fmtMonthLabel, fmtInteger } from '@/lib/market-insights/format';
import { getChartAxisTick, getChartColors } from '@/lib/chart-theme';
import { useMaxMd } from '@/hooks/use-max-md';

const PASTEL = ['#bcd9b8', '#f4c9a8', '#a9c8e8', '#e8b8c8', '#cdbfe8', '#e8dca9'];

function truncateChartLabel(label: string, maxLen: number): string {
  if (label.length <= maxLen) return label;
  return `${label.slice(0, maxLen - 1)}…`;
}

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card p-3 rounded-xl shadow-lg border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label ? fmtMonthLabel(label) : label}</p>
      <p className="text-sm text-foreground/80 tabular-nums">{fmtCurrency(payload[0].value)}</p>
    </div>
  );
};

const QtyTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card p-3 rounded-xl shadow-lg border border-border">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground/80 tabular-nums">{fmtInteger(payload[0].value)} แก้ว/ชิ้น</p>
    </div>
  );
};

export default function InsightChartsInner({ snapshot }: { snapshot: SalesSnapshot }) {
  const { resolvedTheme } = useTheme();
  const isMaxMd = useMaxMd();
  const chartColors = getChartColors(resolvedTheme === 'dark');
  const hasMonthly = snapshot.monthlyTrend.length > 0;
  const hasCategory = snapshot.categoryBreakdown.length > 0;

  const monthlyData = useMemo(
    () =>
      snapshot.monthlyTrend.map((m) => ({
        ...m,
        displayLabel: fmtMonthLabel(m.label),
      })),
    [snapshot.monthlyTrend],
  );

  const topProductsYAxisWidth = isMaxMd ? 72 : 110;
  const topProductsLabelMax = isMaxMd ? 10 : 20;

  if (!hasMonthly && !hasCategory) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center text-muted-foreground/80 text-sm shadow-[0_1px_3px_rgb(0,0,0,0.03)]">
        ยังไม่มีข้อมูลยอดขายเพียงพอสำหรับสร้างกราฟ — อัปโหลดข้อมูลที่หน้า Sales ก่อนนะคะ
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-3">
      {hasMonthly && (
        <div className="w-full shrink-0 rounded-2xl border border-border bg-card p-4 md:p-5 shadow-[0_1px_3px_rgb(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 mb-3 text-muted-foreground">
            <BarChart3 className="w-3.5 h-3.5" />
            <h3 className="text-sm tracking-tight">แนวโน้มรายได้รายเดือน</h3>
            <MetricInfoTip id="monthly_revenue_trend" />
          </div>
          <div className="w-full min-h-[200px]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="displayLabel"
                tick={getChartAxisTick(chartColors.tick)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtCurrencyCompact}
                tick={getChartAxisTick(chartColors.tick)}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: chartColors.cursor }} />
              <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]} fill="#bcd9b8" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasCategory && (
        <div className="w-full shrink-0 rounded-2xl border border-border bg-card p-4 md:p-5 shadow-[0_1px_3px_rgb(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 mb-3 text-muted-foreground">
            <PieChart className="w-3.5 h-3.5" />
            <h3 className="text-sm tracking-tight">สัดส่วนรายได้ตามหมวด</h3>
            <MetricInfoTip id="category_mix" />
          </div>
          <div className="space-y-3">
            {snapshot.categoryBreakdown.map((c, i) => (
              <div key={c.category}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1 gap-2">
                  <span className="truncate">{c.category}</span>
                  <span className="shrink-0 tabular-nums">
                    {c.revenuePercentage.toFixed(1)}% · {fmtCurrency(c.totalRevenue)}
                  </span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(c.revenuePercentage, 100)}%`,
                      backgroundColor: PASTEL[i % PASTEL.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot.topProducts.length > 0 && (
        <div className="w-full shrink-0 rounded-2xl border border-border bg-card p-4 md:p-5 lg:col-span-2 shadow-[0_1px_3px_rgb(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 mb-3 text-muted-foreground">
            <BarChart3 className="w-3.5 h-3.5" />
            <h3 className="text-sm tracking-tight">เมนูขายดี (ตามจำนวน)</h3>
            <MetricInfoTip id="top_products" />
          </div>
          <div className="w-full" style={{ minHeight: Math.max(snapshot.topProducts.length * 44, 120) }}>
          <ResponsiveContainer width="100%" height={Math.max(snapshot.topProducts.length * 44, 120)}>
            <BarChart
              layout="vertical"
              data={snapshot.topProducts}
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={fmtInteger}
                tick={getChartAxisTick(chartColors.tick)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="productName"
                tick={getChartAxisTick(chartColors.tick)}
                axisLine={false}
                tickLine={false}
                width={topProductsYAxisWidth}
                tickFormatter={(value: string) =>
                  truncateChartLabel(String(value), topProductsLabelMax)
                }
              />
              <Tooltip content={<QtyTooltip />} cursor={{ fill: chartColors.cursor }} />
              <Bar dataKey="totalQuantity" radius={[0, 6, 6, 0]}>
                {snapshot.topProducts.map((_, i) => (
                  <Cell key={i} fill={PASTEL[i % PASTEL.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
