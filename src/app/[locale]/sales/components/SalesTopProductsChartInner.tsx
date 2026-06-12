'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CustomTooltip, type SalesTopProductsChartProps } from './SalesTopProductsChart';

export default function SalesTopProductsChartInner({
  topProducts,
  chartColors,
  formatCurrency,
  formatNumber,
}: SalesTopProductsChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
      <BarChart data={topProducts}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
        <XAxis
          dataKey="productName"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: chartColors.tick }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: chartColors.tick }}
          tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          content={
            <CustomTooltip formatCurrency={formatCurrency} formatNumber={formatNumber} />
          }
          cursor={{ fill: chartColors.cursor }}
        />
        <Bar dataKey="totalRevenue" name="ยอดขาย" fill={chartColors.bar} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
