'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, PackageX, CloudRain, Flame } from 'lucide-react';
import type { MarketAlert, AlertType } from '@/app/actions/market-insights-types';
import MetricInfoTip from './MetricInfoTip';
import type { GlossaryId } from '@/lib/market-insights/glossary';

const ALERT_STYLE: Record<
  AlertType,
  { bg: string; icon: React.ReactNode; label: string; tipId: GlossaryId }
> = {
  stockout_risk: {
    bg: 'bg-[#fdeaea]',
    icon: <PackageX className="w-4 h-4" />,
    label: 'เสี่ยงของหมด',
    tipId: 'alert_stockout',
  },
  overstock: {
    bg: 'bg-[#fff6e6]',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'สต็อกเกิน',
    tipId: 'alert_overstock',
  },
  weather: {
    bg: 'bg-[#e9f1fb]',
    icon: <CloudRain className="w-4 h-4" />,
    label: 'สภาพอากาศ',
    tipId: 'alert_weather',
  },
  opportunity: {
    bg: 'bg-[#eef6ee]',
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
          <motion.div
            key={`${alert.type}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-start gap-2.5 rounded-xl border border-black/[0.05] ${style.bg} px-3.5 py-3`}
          >
            <div className="p-2 bg-card/70 rounded-xl text-foreground/70 shrink-0">{style.icon}</div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground/80 flex items-center gap-1">
                {style.label}
                <MetricInfoTip id={style.tipId} />
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{alert.message}</p>
              {alert.linkedItems && alert.linkedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {alert.linkedItems.map((item) => (
                    <span
                      key={item}
                      className="text-xs bg-card/80 text-foreground/70 px-2 py-0.5 rounded-full border border-black/10"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
