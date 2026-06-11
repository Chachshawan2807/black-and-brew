"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: {
  value: ThemeOption;
  icon: typeof Sun;
  labelTh: string;
  labelEn: string;
}[] = [
  { value: "light", icon: Sun, labelTh: "สว่าง", labelEn: "Light" },
  { value: "dark", icon: Moon, labelTh: "มืด", labelEn: "Dark" },
  { value: "system", icon: Monitor, labelTh: "ระบบ", labelEn: "System" },
];

interface ThemePickerProps {
  locale: string;
}

export default function ThemePicker({ locale }: ThemePickerProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isTh = locale === "th";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-16 rounded-2xl bg-muted/40 animate-pulse" />;
  }

  return (
    <div
      role="radiogroup"
      aria-label={isTh ? "เลือกธีม" : "Choose theme"}
      className="flex gap-2"
    >
      {THEME_OPTIONS.map(({ value, icon: Icon, labelTh, labelEn }) => {
        const isActive = theme === value;
        const previewDark =
          value === "dark" || (value === "system" && resolvedTheme === "dark");

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(value)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-2.5 min-h-[64px] bb-transition touch-manipulation active:scale-[0.98]",
              isActive
                ? "border-black/15 bg-black/[0.06] dark:border-white/20 dark:bg-white/10"
                : "border-black/5 bg-transparent hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/5"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full bb-transition",
                previewDark
                  ? "bg-[#2a2a28] text-[#f5f4e8]"
                  : "bg-[#fdfcf0] text-[#1a1a1a] border border-black/8"
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
            </span>
            <span className="text-[13px] font-normal leading-normal text-foreground/85">
              {isTh ? labelTh : labelEn}
            </span>
            {isActive && (
              <Check
                size={11}
                strokeWidth={2.5}
                className="absolute top-2 right-2 text-foreground/50"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
