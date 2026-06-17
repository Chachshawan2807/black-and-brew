'use client';

import React, { useId } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMaxMd } from '@/hooks/use-max-md';
import { MARKET_GLOSSARY, type GlossaryEntry, type GlossaryId } from '@/lib/market-insights/glossary';

const TRIGGER_CLASS =
  'inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground/70 hover:text-muted-foreground hover:bg-black/[0.05] bb-transition shrink-0';

function GlossaryBody({ entry }: { entry: GlossaryEntry }) {
  return (
    <>
      <p className="font-medium mb-1">{entry.title}</p>
      <p className="opacity-80 text-[11px] leading-relaxed">{entry.description}</p>
      {entry.formula && (
        <p className="opacity-55 text-[10px] mt-2 tabular-nums leading-snug border-t border-current/10 pt-2">
          {entry.formula}
        </p>
      )}
      {entry.source && (
        <p className="opacity-45 text-[10px] mt-1.5">ที่มา: {entry.source}</p>
      )}
    </>
  );
}

export default function MetricInfoTip({
  id,
  className,
}: {
  id: GlossaryId;
  className?: string;
}) {
  const entry = MARKET_GLOSSARY[id] as GlossaryEntry;
  const isMaxMd = useMaxMd();
  const popoverId = useId();

  if (!entry) return null;

  const triggerClass = `${TRIGGER_CLASS} ${className ?? ''}`;

  if (isMaxMd === null) {
    return (
      <button
        type="button"
        className={triggerClass}
        aria-label={`อธิบาย: ${entry.title}`}
      >
        <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
    );
  }

  if (isMaxMd) {
    return (
      <>
        <button
          type="button"
          popoverTarget={popoverId}
          className={triggerClass}
          aria-label={`อธิบาย: ${entry.title}`}
        >
          <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <div
          id={popoverId}
          popover="auto"
          className="max-w-[min(300px,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-3 text-left text-popover-foreground text-xs leading-relaxed shadow-md"
        >
          <GlossaryBody entry={entry} />
        </div>
      </>
    );
  }

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          aria-label={`อธิบาย: ${entry.title}`}
        >
          <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-[min(300px,calc(100vw-2rem))] p-3 text-left leading-relaxed"
      >
        <GlossaryBody entry={entry} />
      </TooltipContent>
    </Tooltip>
  );
}

/** Section heading with optional info tip */
export function MetricHeading({
  icon,
  title,
  tipId,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  tipId?: GlossaryId;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      {icon}
      <span>{title}</span>
      {tipId && <MetricInfoTip id={tipId} />}
    </div>
  );
}
