'use client';

import React from 'react';
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

const PASTEL = ['#bcd9b8', '#f4c9a8', '#a9c8e8', '#e8b8c8', '#cdbfe8', '#e8dca9'];

const compact = (n: number) => new Intl.NumberFormat('th-TH', { notation: 'compact' }).format(n);

const ChartTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-3 rounded-xl shadow-lg border border-black/5">
      <p className="text-xs text-black/50 mb-1">{label}</p>
      <p className="text-sm text-black/80">฿{new Intl.NumberFormat('th-TH').format(payload[0].value)}</p>
    </div>
  );
};

export default function InsightCharts({ snapshot }: { snapshot: SalesSnapshot }) {
  const hasMonthly = snapshot.monthlyTrend.length > 0;
  const hasCategory = snapshot.categoryBreakdown.length > 0;

  if (!hasMonthly && !hasCategory) {
    return (
      <div className="bb-card p-8 text-center text-black/40 text-sm">
        ยังไม่มีข้อมูลยอดขายเพียงพอสำหรับสร้างกราฟ — อัปโหลดข้อมูลที่หน้า Sales ก่อนนะคะ
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {hasMonthly && (
        <div className="bb-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4 text-black/60">
            <BarChart3 className="w-4 h-4" />
            <h3 className="text-sm md:text-base">แนวโน้มรายได้รายเดือน</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={snapshot.monthlyTrend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.4)' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.4)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="totalRevenue" radius={[6, 6, 0, 0]} fill="#bcd9b8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasCategory && (
        <div className="bb-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4 text-black/60">
            <PieChart className="w-4 h-4" />
            <h3 className="text-sm md:text-base">สัดส่วนรายได้ตามหมวด</h3>
          </div>
          <div className="space-y-3">
            {snapshot.categoryBreakdown.map((c, i) => (
              <div key={c.category}>
                <div className="flex justify-between text-xs text-black/60 mb-1">
                  <span>{c.category}</span>
                  <span>{c.revenuePercentage}%</span>
                </div>
                <div className="h-2.5 bg-black/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
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

      {/* Top products mini bar */}
      {snapshot.topProducts.length > 0 && (
        <div className="bb-card p-5 md:p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 text-black/60">
            <BarChart3 className="w-4 h-4" />
            <h3 className="text-sm md:text-base">เมนูขายดี (ตามจำนวน)</h3>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(snapshot.topProducts.length * 44, 120)}>
            <BarChart
              layout="vertical"
              data={snapshot.topProducts}
              margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.4)' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="productName"
                tick={{ fontSize: 11, fill: 'rgba(0,0,0,0.55)' }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="totalQuantity" radius={[0, 6, 6, 0]}>
                {snapshot.topProducts.map((_, i) => (
                  <Cell key={i} fill={PASTEL[i % PASTEL.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
