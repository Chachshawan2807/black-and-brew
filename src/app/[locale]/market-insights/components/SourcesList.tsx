'use client';

import React from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import type { MarketSource } from '@/app/actions/market-insights-types';
import MetricInfoTip from './MetricInfoTip';

export default function SourcesList({ sources }: { sources: MarketSource[] }) {
  if (!sources.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-[0_1px_3px_rgb(0,0,0,0.03)]">
      <div className="flex items-center gap-1.5 mb-3 text-muted-foreground">
        <Link2 className="w-3.5 h-3.5" />
        <h3 className="text-sm tracking-tight">แหล่งอ้างอิงเทรนด์ภายนอก</h3>
        <MetricInfoTip id="external_sources" />
      </div>
      <ul className="space-y-2">
        {sources.slice(0, 8).map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 rounded-xl p-2.5 hover:bg-black/[0.03] bb-transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/80 mt-1 shrink-0 group-hover:text-foreground/70" />
              <div className="min-w-0">
                <p className="text-sm text-foreground/80 truncate">{s.title}</p>
                {s.snippet && <p className="text-xs text-muted-foreground/90 line-clamp-2">{s.snippet}</p>}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
