'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandMoreButtonProps {
  expanded: boolean;
  onClick: (e: React.MouseEvent) => void;
  isTh: boolean;
  moreLabel?: string;
  lessLabel?: string;
  className?: string;
}

export function ExpandMoreButton({
  expanded,
  onClick,
  isTh,
  moreLabel,
  lessLabel,
  className,
}: ExpandMoreButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground bb-transition',
        className
      )}
    >
      <ChevronDown
        size={12}
        strokeWidth={1.75}
        className={cn('bb-transition', expanded && 'rotate-180')}
      />
      {expanded
        ? lessLabel ?? (isTh ? 'ย่อ' : 'Less')
        : moreLabel ?? (isTh ? 'เพิ่มเติม' : 'More')}
    </button>
  );
}
