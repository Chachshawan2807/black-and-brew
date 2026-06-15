'use client';

import React from 'react';
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
import MetricInfoTip from './MetricInfoTip';
import { fmtCurrency, fmtPctChange, fmtMonthLabel } from '@/lib/market-insights/format';
import { humanizeSignal } from '@/lib/market-insights/glossary';
import type { GlossaryId } from '@/lib/market-insights/glossary';

function KpiCard({
  icon,
  label,
  tipId,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  tipId: GlossaryId;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="relative w-full min-w-0 shrink-0 rounded-2xl border border-border bg-card px-3.5 py-3 shadow-[0_1px_3px_rgb(0,0,0,0.03)]">
      <div className="flex items-center gap-1 text-muted-foreground/90 mb-1.5 min-w-0">
        {icon}
        <span className="text-[11px] truncate">{label}</span>
        <MetricInfoTip id={tipId} />
      </div>
      <div className="text-base md:text-lg text-foreground leading-tight tabular-nums tracking-tight break-words">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug break-words">
          {sub}
        </div>
      )}
    </div>
  );
}

function StripSection({
  icon,
  title,
  tipId,
  children,
  className = '',
}: {
  icon: React.ReactNode;
  title: string;
  tipId: GlossaryId;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-4 py-3.5 min-w-0 ${className}`}>
      <div className="flex items-center gap-1 text-muted-foreground mb-2 min-w-0">
        {icon}
        <span className="text-[11px] leading-snug">{title}</span>
        <MetricInfoTip id={tipId} />
      </div>
      {children}
    </div>
  );
}

export default function ContextPanel({ context }: { context: MarketContext }) {
  const { weather, salesSnapshot, scheduleToday, upcomingHolidays, signals } = context;
  const mom = salesSnapshot.momChangePercentage;
  const momDetail = salesSnapshot.momDetail;
  const topCategory = salesSnapshot.categoryBreakdown[0];
  const hasHolidays = upcomingHolidays.length > 0;
  const hasRainHourly = weather.hourly.length > 0;

  const momSub = momDetail
    ? `${fmtMonthLabel(momDetail.currentLabel)} vs ${fmtMonthLabel(momDetail.previousLabel)} · ${fmtCurrency(momDetail.changeAbsolute)}`
    : 'เทียบเดือนก่อน';

  const shiftNames = scheduleToday.map((s) => s.fullName).join(', ') || 'ไม่มีข้อมูล';

  return (
    <div className="space-y-3">
      <div className="flex w-full flex-col gap-2.5 sm:grid sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
        <KpiCard
          icon={<CloudSun className="w-3.5 h-3.5 shrink-0" />}
          label="อากาศวันนี้"
          tipId="weather_today"
          value={weather.current ? `${weather.current.temp}°C` : 'N/A'}
          sub={weather.current?.description}
        />
        <KpiCard
          icon={
            mom !== null && mom >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 shrink-0" />
            )
          }
          label="ยอดขาย MoM"
          tipId="mom_sales"
          value={fmtPctChange(mom)}
          sub={momSub}
        />
        <KpiCard
          icon={<TrendingUp className="w-3.5 h-3.5 shrink-0" />}
          label="หมวดเด่น"
          tipId="top_category"
          value={topCategory ? topCategory.category : 'N/A'}
          sub={
            topCategory
              ? `${topCategory.revenuePercentage.toFixed(1)}% · ${fmtCurrency(topCategory.totalRevenue)}`
              : undefined
          }
        />
        <KpiCard
          icon={<Users className="w-3.5 h-3.5 shrink-0" />}
          label="กะวันนี้"
          tipId="shift_today"
          value={`${scheduleToday.length} คน`}
          sub={shiftNames}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgb(0,0,0,0.03)] divide-y divide-border">
        {hasRainHourly && (
          <StripSection
            icon={<Droplets className="w-3.5 h-3.5 shrink-0" />}
            title="โอกาสฝนช่วงเปิดร้าน (06:00–18:00)"
            tipId="rain_probability"
          >
            <div className="flex flex-wrap gap-1.5">
              {weather.hourly.map((h) => (
                <div
                  key={h.time}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-muted border border-border px-2 py-1"
                >
                  <span className="text-[10px] text-muted-foreground/80 tabular-nums">{h.time}</span>
                  <span className="text-[11px] text-foreground/70 tabular-nums">{h.temp}°</span>
                  <span
                    className={`text-[10px] tabular-nums font-medium ${h.pop >= 50 ? 'text-blue-600' : 'text-muted-foreground/70'}`}
                  >
                    {h.pop}%
                  </span>
                </div>
              ))}
            </div>
            {weather.operatingSummary && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-snug">{weather.operatingSummary}</p>
            )}
          </StripSection>
        )}

        <StripSection
          icon={<Store className="w-3.5 h-3.5 shrink-0" />}
          title="สัญญาณตลาดที่ AI ใช้"
          tipId="market_signals"
        >
          <div className="flex flex-wrap gap-1.5">
            {signals.length ? (
              signals.map((s) => {
                const { label, tip } = humanizeSignal(s);
                return (
                  <span
                    key={s}
                    title={tip}
                    className="text-[10px] bg-muted text-foreground/80 px-2 py-0.5 rounded-full border border-border"
                  >
                    {label}
                  </span>
                );
              })
            ) : (
              <span className="text-[11px] text-muted-foreground">ดำเนินงานปกติ</span>
            )}
          </div>
        </StripSection>

        <StripSection
          icon={<CalendarDays className="w-3.5 h-3.5 shrink-0" />}
          title="วันหยุดใกล้นี้"
          tipId="holidays"
        >
          {hasHolidays ? (
            <div className="flex flex-wrap gap-1.5">
              {upcomingHolidays.slice(0, 4).map((h) => (
                <span
                  key={h.date}
                  className="text-[10px] bb-pastel-surface bg-[#fff6e6] text-black/65 px-2 py-0.5 rounded-full border border-[#ffeeba]"
                >
                  {h.date.slice(5)} {h.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-snug">ไม่มีวันหยุดใน 14 วันข้างหน้า</p>
          )}
        </StripSection>
      </div>
    </div>
  );
}
