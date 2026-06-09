'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Copy, Check, Clock, Target } from 'lucide-react';
import { MARKET_INSIGHTS_ACTIONS_KEY_V2, type ActionItem } from '@/app/actions/market-insights-types';

const PRIORITY_LABEL: Record<number, { text: string; cls: string }> = {
  1: { text: 'ด่วน', cls: 'bg-[#fdeaea] text-red-700/80' },
  2: { text: 'ปานกลาง', cls: 'bg-[#fff6e6] text-amber-700/80' },
  3: { text: 'ทั่วไป', cls: 'bg-[#eef6ee] text-green-800/70' },
};

export default function ActionChecklist({ actions }: { actions: ActionItem[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(MARKET_INSIGHTS_ACTIONS_KEY_V2);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  const toggle = (title: string) => {
    setDone((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem(MARKET_INSIGHTS_ACTIONS_KEY_V2, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  };

  const askBru = async (action: ActionItem) => {
    const prompt = `ช่วยขยายแผนนี้ให้ละเอียดและบอกขั้นตอนลงมือทำหน่อยค่ะ: "${action.title}" (กรอบเวลา: ${action.timeframe}, ผลที่คาดหวัง: ${action.expectedImpact})`;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(action.id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!actions.length) return null;

  return (
    <div className="space-y-3">
      {actions.map((action, i) => {
        const isDone = mounted && done[action.title];
        const pr = PRIORITY_LABEL[action.priority] ?? PRIORITY_LABEL[3];
        return (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bb-card p-4 md:p-5 ${isDone ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggle(action.title)}
                className="mt-0.5 shrink-0 text-black/70 hover:text-black bb-transition"
                aria-label={isDone ? 'ทำแล้ว' : 'ยังไม่ทำ'}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${pr.cls}`}>{pr.text}</span>
                  <h4 className={`text-sm md:text-base text-black/85 ${isDone ? 'line-through' : ''}`}>
                    {action.title}
                  </h4>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-black/50">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {action.timeframe}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> {action.expectedImpact}
                  </span>
                </div>
                {action.linkedProducts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {action.linkedProducts.map((p) => (
                      <span
                        key={p}
                        className="text-xs bg-black/[0.04] text-black/60 px-2 py-0.5 rounded-full border border-black/5"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => askBru(action)}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs text-black/60 hover:text-black border border-black/10 rounded-full px-3 py-1.5 bb-transition"
              >
                {copied === action.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> คัดลอกแล้ว
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> ถามบรู
                  </>
                )}
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
