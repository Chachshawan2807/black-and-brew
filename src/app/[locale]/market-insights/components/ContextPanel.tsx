'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CloudSun,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarDays,
  Store,
  Droplets,
} from 'lucide-react';
import type { MarketContext } from '@/app/actions/market-insights-types';

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="bb-card p-4 md:p-5">
      <div className="flex items-center gap-2 text-black/50 mb-2">
        {icon}
        <span className="text-xs md:text-sm">{label}</span>
      </div>
      <div className="text-lg md:text-xl text-black leading-tight">{value}</div>
      {sub && <div className="text-xs text-black/40 mt-1">{sub}</div>}
    </div>
  );
}

export default function ContextPanel({ context }: { context: MarketContext }) {
  const { weather, salesSnapshot, scheduleToday, upcomingHolidays, signals, competitors } = context;
  const mom = salesSnapshot.momChangePercentage;
  const topCategory = salesSnapshot.categoryBreakdown[0];
  const nextHoliday = upcomingHolidays[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          icon={<CloudSun className="w-4 h-4" />}
          label="อากาศวันนี้"
          value={weather.current ? `${weather.current.temp}°C` : 'N/A'}
          sub={weather.current?.description}
        />
        <KpiCard
          icon={mom !== null && mom >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          label="ยอดขาย MoM"
          value={mom !== null ? `${mom >= 0 ? '+' : ''}${mom}%` : 'N/A'}
          sub="เทียบเดือนก่อน"
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="หมวดเด่น"
          value={topCategory ? topCategory.category : 'N/A'}
          sub={topCategory ? `${topCategory.revenuePercentage}% ของรายได้` : undefined}
        />
        <KpiCard
          icon={<Users className="w-4 h-4" />}
          label="กะวันนี้"
          value={`${scheduleToday.length} คน`}
          sub={scheduleToday.map((s) => s.fullName).join(', ') || 'ไม่มีข้อมูล'}
        />
      </div>

      {/* Weather operating window + rain hours */}
      {weather.hourly.length > 0 && (
        <div className="bb-card p-4 md:p-5">
          <div className="flex items-center gap-2 text-black/50 mb-3">
            <Droplets className="w-4 h-4" />
            <span className="text-sm">โอกาสฝนช่วงเปิดร้าน (06:00–18:00)</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weather.hourly.map((h) => (
              <div
                key={h.time}
                className="flex flex-col items-center gap-1 min-w-[60px] bg-black/[0.03] rounded-xl px-2 py-2"
              >
                <span className="text-xs text-black/50">{h.time}</span>
                <span className="text-sm text-black">{h.temp}°</span>
                <span className={`text-xs ${h.pop >= 50 ? 'text-blue-600' : 'text-black/40'}`}>
                  {h.pop}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-black/40 mt-2">{weather.operatingSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Signals */}
        <div className="bb-card p-4 md:p-5">
          <div className="flex items-center gap-2 text-black/50 mb-3">
            <Store className="w-4 h-4" />
            <span className="text-sm">สัญญาณตลาดที่ AI ใช้</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {signals.length ? (
              signals.map((s) => (
                <span
                  key={s}
                  className="text-xs bg-black/[0.04] text-black/60 px-2.5 py-1 rounded-full border border-black/5"
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-sm text-black/40">baseline: ดำเนินงานปกติ</span>
            )}
          </div>
        </div>

        {/* Holidays + competitors */}
        <div className="bb-card p-4 md:p-5 space-y-3">
          <div className="flex items-center gap-2 text-black/50">
            <CalendarDays className="w-4 h-4" />
            <span className="text-sm">วันหยุดใกล้นี้</span>
          </div>
          {nextHoliday ? (
            <div className="flex flex-wrap gap-1.5">
              {upcomingHolidays.slice(0, 4).map((h) => (
                <span
                  key={h.date}
                  className="text-xs bg-[#fff6e6] text-black/70 px-2.5 py-1 rounded-full border border-black/5"
                >
                  {h.date.slice(5)} {h.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-black/40">ไม่มีวันหยุดใน 14 วันข้างหน้า</p>
          )}

          {competitors.length > 0 && (
            <div className="pt-2 border-t border-black/5">
              <p className="text-xs text-black/40 mb-1.5">คาเฟ่ใกล้เคียง (รัศมี 2 กม.)</p>
              <div className="flex flex-wrap gap-1.5">
                {competitors.slice(0, 5).map((c) => (
                  <span
                    key={c.name}
                    className="text-xs bg-black/[0.04] text-black/60 px-2.5 py-1 rounded-full border border-black/5"
                  >
                    {c.name}
                    {c.rating ? ` · ${c.rating}★` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
