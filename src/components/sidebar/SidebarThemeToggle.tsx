"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

type ThemeValue = "light" | "dark";

const THEME_OPTIONS: {
  value: ThemeValue;
  icon: typeof Sun;
  labelTh: string;
  labelEn: string;
}[] = [
  { value: "light", icon: Sun, labelTh: "สว่าง", labelEn: "Light" },
  { value: "dark", icon: Moon, labelTh: "มืด", labelEn: "Dark" },
];

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
          "rounded-2xl bg-muted/40 animate-pulse",
          isOpen === false ? "h-10 w-10 mx-auto" : "h-16 w-full",
        )}
        aria-hidden
      />
    );
  }

  const activeTheme: ThemeValue =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark")
      ? "dark"
      : "light";

  const renderOption = (
    { value, icon: Icon, labelTh, labelEn }: (typeof THEME_OPTIONS)[number],
    compact: boolean,
  ) => {
    const isActive = activeTheme === value;
    const previewDark = value === "dark";
    const label = isTh ? labelTh : labelEn;

    const button = (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={isActive}
        aria-label={label}
        onClick={() => setTheme(value)}
        className={cn(
          "relative bb-transition touch-manipulation active:scale-[0.98]",
          compact
            ? cn(
                "flex h-10 w-10 items-center justify-center rounded-xl border",
                isActive
                  ? "border-foreground/20 bg-muted"
                  : "border-transparent hover:bg-muted/60",
              )
            : cn(
                "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 min-h-[64px]",
                isActive
                  ? "border-black/15 bg-black/[0.06] dark:border-white/20 dark:bg-white/10"
                  : "border-black/5 bg-transparent hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/5",
              ),
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-full bb-transition",
            compact ? "h-8 w-8" : "h-8 w-8",
            previewDark
              ? "bg-[#2a2a28] text-[#f5f4e8]"
              : "bg-[#fdfcf0] text-[#1a1a1a] border border-black/8",
          )}
        >
          <Icon size={15} strokeWidth={1.75} />
        </span>
        {!compact && (
          <span className="text-[13px] font-normal leading-normal text-foreground/85">
            {label}
          </span>
        )}
        {isActive && !compact && (
          <Check
            size={11}
            strokeWidth={2.5}
            className="absolute top-2 right-2 text-foreground/50"
            aria-hidden
          />
        )}
      </button>
    );

    if (!compact) return button;

    return (
      <TooltipProvider disableHoverableContent key={value}>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div
      role="radiogroup"
      aria-label={isTh ? "เลือกธีม" : "Choose theme"}
      className={cn(
        isOpen === false
          ? "flex flex-col items-center gap-1"
          : "flex gap-2 w-full",
      )}
    >
      {THEME_OPTIONS.map((option) =>
        renderOption(option, isOpen === false),
      )}
    </div>
  );
}
