'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import type { MarketInsightsDiff } from '@/app/actions/market-insights-types';
import MetricInfoTip from './MetricInfoTip';
import { humanizeSignal } from '@/lib/market-insights/glossary';

export default function DiffBanner({ diff }: { diff?: MarketInsightsDiff }) {
  if (!diff || (diff.newSignals.length === 0 && diff.changedActionTitles.length === 0)) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#c3e6cb] bb-pastel-surface bg-[#eef6ee] p-4 md:p-5">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">มีอะไรเปลี่ยนไปจากรอบก่อน</span>
        <MetricInfoTip id="diff_banner" />
      </div>
      <div className="flex flex-wrap gap-2">
        {diff.newSignals.map((s) => (
          <span
            key={`sig-${s}`}
            className="text-xs bg-card/70 text-foreground/70 px-2.5 py-1 rounded-full border border-border"
          >
            สัญญาณใหม่: {humanizeSignal(s).label}
          </span>
        ))}
        {diff.changedActionTitles.map((t) => (
          <span
            key={`act-${t}`}
            className="text-xs bg-card/70 text-foreground/70 px-2.5 py-1 rounded-full border border-border"
          >
            แผนใหม่: {t}
          </span>
        ))}
      </div>
    </div>
  );
}
