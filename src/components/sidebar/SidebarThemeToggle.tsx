"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from '@/lib/icons';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface SidebarThemeToggleProps {
  locale: string;
  isOpen: boolean | undefined;
}

export default function SidebarThemeToggle({
  locale,
  isOpen,
}: SidebarThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isTh = locale === "th";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "rounded-full bg-muted/40 animate-pulse",
          isOpen === false ? "h-11 w-14 mx-auto" : "h-11 w-full",
        )}
        aria-hidden
      />
    );
  }

  const activeTheme =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark")
      ? "dark"
      : "light";
  const isDark = activeTheme === "dark";
  const nextThemeLabel = isDark
    ? isTh ? "สว่าง" : "light"
    : isTh ? "มืด" : "dark";
  const switchLabel = isTh
    ? `สลับเป็นธีม${nextThemeLabel}`
    : `Switch to ${nextThemeLabel} theme`;

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={switchLabel}
      onClick={() => setTheme(activeTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        "relative flex touch-manipulation items-center bb-transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:active:scale-100",
        isOpen === false
          ? "mx-auto size-10 min-w-10 flex-none justify-center gap-0 rounded-xl border border-border/60 bg-card p-0 hover:bg-muted/60"
          : "h-11 w-full justify-between rounded-xl border border-border/60 bg-card px-3 text-foreground hover:bg-muted/40",
      )}
    >
      {isOpen !== false && (
        <span className="text-[13px] font-normal text-foreground">
          {isTh ? `ธีม${isDark ? 'มืด' : 'สว่าง'}` : `${isDark ? 'Dark' : 'Light'} theme`}
        </span>
      )}
      <span
        data-theme-icon-stage
        data-theme={activeTheme}
        aria-hidden
        className="theme-toggle-icon-stage"
      >
        <span data-theme-icon="sun" className="theme-toggle-icon theme-toggle-icon-sun">
          <Sun size={17} strokeWidth={1.75} className="text-amber-700 dark:text-amber-300" />
        </span>
        <span data-theme-icon="moon" className="theme-toggle-icon theme-toggle-icon-moon">
          <Moon size={17} strokeWidth={1.75} className="text-foreground" />
        </span>
      </span>
    </button>
  );

  if (isOpen !== false) return control;

  return (
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{control}</TooltipTrigger>
        <TooltipContent side="right">{switchLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
