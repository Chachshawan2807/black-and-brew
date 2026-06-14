'use client';

import React from 'react';
import { AlertTriangle, PackageX, CloudRain, Flame } from 'lucide-react';
import type { MarketAlert, AlertType } from '@/app/actions/market-insights-types';
import MetricInfoTip from './MetricInfoTip';
import type { GlossaryId } from '@/lib/market-insights/glossary';

const ALERT_STYLE: Record<
  AlertType,
  { bg: string; icon: React.ReactNode; label: string; tipId: GlossaryId }
> = {
  stockout_risk: {
    bg: 'bb-pastel-surface bg-[#fdeaea] border-[#f5c6cb]',
    icon: <PackageX className="w-4 h-4" />,
    label: 'เสี่ยงของหมด',
    tipId: 'alert_stockout',
  },
  overstock: {
    bg: 'bb-pastel-surface bg-[#fff6e6] border-[#ffeeba]',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'สต็อกเกิน',
    tipId: 'alert_overstock',
  },
  weather: {
    bg: 'bb-pastel-surface bg-[#e9f1fb] border-[#bee5eb]',
    icon: <CloudRain className="w-4 h-4" />,
    label: 'สภาพอากาศ',
    tipId: 'alert_weather',
  },
  opportunity: {
    bg: 'bb-pastel-surface bg-[#eef6ee] border-[#c3e6cb]',
    icon: <Flame className="w-4 h-4" />,
    label: 'โอกาสขาย',
    tipId: 'alert_opportunity',
  },
};

export default function AlertsCard({ alerts }: { alerts: MarketAlert[] }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => {
        const style = ALERT_STYLE[alert.type];
        return (
          <div
            key={`${alert.type}-${i}`}
            className={`flex items-start gap-2.5 rounded-xl border ${style.bg} px-3.5 py-3`}
          >
            <div className="p-2 bg-card/70 rounded-xl shrink-0">{style.icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium flex items-center gap-1">
                {style.label}
                <MetricInfoTip id={style.tipId} />
              </p>
              <p className="text-sm text-black/70 leading-relaxed">{alert.message}</p>
              {alert.linkedItems && alert.linkedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {alert.linkedItems.map((item) => (
                    <span
                      key={item}
                      className="text-xs bg-card text-foreground/80 px-2 py-0.5 rounded-full border border-border"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
