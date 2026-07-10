'use client';

import { useState } from 'react';
import { ExpandMoreButton } from '@/components/ui/expand-more-button';
import { cn } from '@/lib/utils';

const MAX_LINES = 3;

interface ExpandableLinesProps {
  lines: string[];
  isTh: boolean;
  maxLines?: number;
  className?: string;
  lineClassName?: string;
  firstLineClassName?: string;
}

export function ExpandableLines({
  lines,
  isTh,
  maxLines = MAX_LINES,
  className,
  lineClassName = 'text-[12px] text-muted-foreground/90 leading-normal',
  firstLineClassName,
}: ExpandableLinesProps) {
  const [expanded, setExpanded] = useState(false);
  const filtered = lines.filter(Boolean);
  if (filtered.length === 0) return null;

  const hasMore = filtered.length > maxLines;
  const visible = expanded ? filtered : filtered.slice(0, maxLines);

  return (
    <div className={className}>
      {visible.map((line, i) => (
        <p
          key={i}
          className={cn(
            i === 0 && firstLineClassName ? firstLineClassName : lineClassName,
            i > 0 && 'mt-0.5'
          )}
        >
          {line}
        </p>
      ))}
      {hasMore && (
        <ExpandMoreButton
          expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          isTh={isTh}
          className="mt-1"
        />
      )}
    </div>
  );
}
