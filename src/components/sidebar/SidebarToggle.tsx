"use client";

import { ChevronLeft } from '@/lib/icons';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HintTooltip } from "@/components/ui/hint-tooltip";

interface SidebarToggleProps {
  isOpen: boolean | undefined;
  setIsOpen?: () => void;
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
  return (
    <div
      className={cn(
        "invisible lg:visible absolute z-[130] shrink-0 top-1/2 -translate-y-1/2",
        isOpen === false
          ? "left-full ml-1.5"
          : "right-0",
      )}
    >
      <HintTooltip tip={isOpen === false ? "ขยายเมนูด้านข้าง" : "ย่อเมนูด้านข้าง"} side="right">
        <Button
          onClick={() => setIsOpen?.()}
          className="rounded-full h-7 w-7 min-h-0 min-w-0 p-0 bg-card border border-border bb-shadow-sm hover:bg-muted dark:hover:bg-muted/80 bb-transition text-foreground"
          variant="ghost"
          size="icon"
          aria-label={isOpen === false ? "ขยายเมนูด้านข้าง" : "ย่อเมนูด้านข้าง"}
        >
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 text-foreground bb-transition [transition-property:transform]",
              isOpen === false ? "rotate-180" : "rotate-0"
            )}
            strokeWidth={2}
          />
        </Button>
      </HintTooltip>
    </div>
  );
}
