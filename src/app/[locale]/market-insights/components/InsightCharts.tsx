'use client';

import dynamic from 'next/dynamic';
import type { SalesSnapshot } from '@/app/actions/market-insights-types';

const InsightChartsInner = dynamic(() => import('./InsightChartsInner'), {
  ssr: false,
  loading: () => (
    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-3">
      <div className="h-64 w-full shrink-0 rounded-2xl border border-border bg-muted/30 animate-pulse" />
      <div className="h-64 w-full shrink-0 rounded-2xl border border-border bg-muted/30 animate-pulse" />
    </div>
  ),
});

export default function InsightCharts({ snapshot }: { snapshot: SalesSnapshot }) {
  return <InsightChartsInner snapshot={snapshot} />;
}
