'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { MarketInsightsDiff } from '@/app/actions/market-insights-types';

export default function DiffBanner({ diff }: { diff?: MarketInsightsDiff }) {
  if (!diff || (diff.newSignals.length === 0 && diff.changedActionTitles.length === 0)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-black/10 bg-[#eef6ee] p-4 md:p-5"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-black/70" />
        <span className="text-sm font-medium text-black/80">มีอะไรเปลี่ยนไปจากรอบก่อน</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {diff.newSignals.map((s) => (
          <span
            key={`sig-${s}`}
            className="text-xs bg-white/70 text-black/70 px-2.5 py-1 rounded-full border border-black/10"
          >
            สัญญาณใหม่: {s}
          </span>
        ))}
        {diff.changedActionTitles.map((t) => (
          <span
            key={`act-${t}`}
            className="text-xs bg-white/70 text-black/70 px-2.5 py-1 rounded-full border border-black/10"
          >
            แผนใหม่: {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
