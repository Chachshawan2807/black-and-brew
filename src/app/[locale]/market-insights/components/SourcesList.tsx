'use client';

import React from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import type { MarketSource } from '@/app/actions/market-insights-types';

export default function SourcesList({ sources }: { sources: MarketSource[] }) {
  if (!sources.length) return null;

  return (
    <div className="bb-card p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4 text-black/60">
        <Link2 className="w-4 h-4" />
        <h3 className="text-sm md:text-base">แหล่งอ้างอิงเทรนด์ภายนอก</h3>
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
              <ExternalLink className="w-3.5 h-3.5 text-black/40 mt-1 shrink-0 group-hover:text-black/70" />
              <div className="min-w-0">
                <p className="text-sm text-black/80 truncate">{s.title}</p>
                {s.snippet && <p className="text-xs text-black/45 line-clamp-2">{s.snippet}</p>}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
