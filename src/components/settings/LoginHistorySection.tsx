"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  Tablet,
  Monitor,
  HelpCircle,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchLoginHistory,
  type LoginHistoryRow,
} from "@/app/actions/login-history-actions";

interface LoginHistorySectionProps {
  locale: string;
}

function deviceIcon(type: string) {
  switch (type) {
    case "mobile":
      return Smartphone;
    case "tablet":
      return Tablet;
    case "desktop":
      return Monitor;
    default:
      return HelpCircle;
  }
}

function eventIcon(type: LoginHistoryRow["event_type"]) {
  switch (type) {
    case "login_success":
      return LogIn;
    case "logout":
      return LogOut;
    case "lockout":
      return ShieldAlert;
    case "login_failure":
      return ShieldX;
    default:
      return HelpCircle;
  }
}

function eventLabel(type: LoginHistoryRow["event_type"], isTh: boolean) {
  const labels: Record<LoginHistoryRow["event_type"], { th: string; en: string }> = {
    login_success: { th: "เข้าสู่ระบบสำเร็จ", en: "Login success" },
    login_failure: { th: "เข้าสู่ระบบล้มเหลว", en: "Login failed" },
    logout: { th: "ออกจากระบบ", en: "Logout" },
    lockout: { th: "ถูกล็อกชั่วคราว", en: "Temporary lockout" },
  };
  return isTh ? labels[type].th : labels[type].en;
}

function formatDevice(row: LoginHistoryRow, isTh: boolean) {
  const parts = [
    row.device_vendor,
    row.device_model,
    row.os_name && row.os_version ? `${row.os_name} ${row.os_version}` : row.os_name,
    row.browser_name,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" · ");

  const typeLabels: Record<string, { th: string; en: string }> = {
    mobile: { th: "มือถือ", en: "Mobile" },
    tablet: { th: "แท็บเล็ต", en: "Tablet" },
    desktop: { th: "เดสก์ท็อป", en: "Desktop" },
    unknown: { th: "ไม่ทราบอุปกรณ์", en: "Unknown device" },
  };

  return isTh
    ? typeLabels[row.device_type]?.th ?? typeLabels.unknown.th
    : typeLabels[row.device_type]?.en ?? typeLabels.unknown.en;
}

function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

export default function LoginHistorySection({ locale }: LoginHistorySectionProps) {
  const [rows, setRows] = useState<LoginHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isTh = locale === "th";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const result = await fetchLoginHistory(50);
      if (cancelled) return;

      if (!result.success) {
        setError(result.error);
        setRows([]);
      } else {
        setError(null);
        setRows(result.rows);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[14px] leading-relaxed text-red-500 font-normal py-4 text-center">
        {isTh ? "ไม่สามารถโหลดประวัติได้" : "Unable to load history"}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-[14px] leading-relaxed text-muted-foreground font-normal py-8 text-center">
        {isTh ? "ยังไม่มีประวัติการเข้าสู่ระบบ" : "No login history yet"}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const DeviceIcon = deviceIcon(row.device_type);
        const EventIcon = eventIcon(row.event_type);
        const isFailure = row.status !== "success";

        return (
          <div
            key={row.id}
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-3.5 py-3.5 bb-transition",
              isFailure
                ? "border-red-500/15 bg-red-500/[0.04]"
                : "border-black/5 dark:border-white/10 bg-card"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                isFailure ? "bg-red-500/10 text-red-500" : "bg-muted text-foreground/70"
              )}
            >
              <EventIcon size={16} strokeWidth={1.75} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-normal text-foreground leading-snug">
                  {eventLabel(row.event_type, isTh)}
                </p>
                <time className="shrink-0 text-[12px] text-muted-foreground/90 whitespace-nowrap leading-normal">
                  {formatDateTime(row.occurred_at, locale)}
                </time>
              </div>

              <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground leading-normal">
                <DeviceIcon size={13} strokeWidth={1.75} />
                <span className="truncate">{formatDevice(row, isTh)}</span>
              </div>

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground/85 leading-normal">
                {row.ip_address && (
                  <span>IP {row.ip_address}</span>
                )}
                {row.access_level && (
                  <span>
                    {row.access_level === "read_only"
                      ? isTh ? "แก้ไขข้อมูลไม่ได้" : "Cannot edit data"
                      : isTh ? "แก้ไขข้อมูลได้" : "Can edit data"}
                  </span>
                )}
                {row.failure_reason && (
                  <span className="text-red-500/80">{row.failure_reason}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
