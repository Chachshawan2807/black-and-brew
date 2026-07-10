"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpCircle, LogIn, LogOut, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchLoginHistoryBundle,
  type LoginHistoryRow,
} from "@/app/actions/login-history-actions";
import type { ActiveLoginSession } from "@/lib/login-session-status";
import { ExpandableLines } from "@/components/ui/expandable-lines";
import { ExpandMoreButton } from "@/components/ui/expand-more-button";
import ActiveRemoteSessionsPanel from './ActiveRemoteSessionsPanel';
import {
  formatLoginDeviceLabel,
  formatLoginDeviceMetadata,
} from "@/lib/format-login-device";

interface LoginHistorySectionProps {
  locale: string;
}

const PREVIEW_COUNT = 3;

function EventIcon({
  type,
  size,
  strokeWidth,
}: {
  type: LoginHistoryRow["event_type"];
  size: number;
  strokeWidth: number;
}) {
  const props = { size, strokeWidth };
  switch (type) {
    case "login_success":
      return <LogIn {...props} />;
    case "logout":
      return <LogOut {...props} />;
    case "lockout":
      return <ShieldAlert {...props} />;
    case "login_failure":
      return <ShieldX {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
}

function eventLabel(type: LoginHistoryRow["event_type"], isTh: boolean) {
  const labels: Record<LoginHistoryRow["event_type"], { th: string; en: string }> = {
    login_success: { th: "เข้าสู่ระบบสำเร็จ", en: "Signed in" },
    login_failure: { th: "เข้าสู่ระบบไม่สำเร็จ", en: "Sign-in failed" },
    logout: { th: "ออกจากระบบ", en: "Signed out" },
    lockout: { th: "ถูกล็อกชั่วคราว", en: "Temporarily locked" },
  };
  return isTh ? labels[type].th : labels[type].en;
}

function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

function localizeFailureReason(reason: string, isTh: boolean): string {
  const map: Record<string, { th: string; en: string }> = {
    "Unknown passkey credential": {
      th: "ไม่พบลายนิ้วมือที่ลงทะเบียนไว้",
      en: "Unknown passkey credential",
    },
    "Invalid PIN": {
      th: "รหัส PIN ไม่ถูกต้อง",
      en: "Invalid PIN",
    },
  };
  const hit = map[reason];
  if (hit) return isTh ? hit.th : hit.en;
  return reason;
}

function buildLoginLines(row: LoginHistoryRow, locale: string, isTh: boolean): string[] {
  const lines: string[] = [];
  lines.push(eventLabel(row.event_type, isTh));
  lines.push(
    formatLoginDeviceLabel(
      {
        deviceType: row.device_type,
        deviceVendor: row.device_vendor,
        deviceModel: row.device_model,
        osName: row.os_name,
        osVersion: row.os_version,
        browserName: row.browser_name,
        browserVersion: row.browser_version,
        metadata: row.metadata,
      },
      isTh
    )
  );
  lines.push(formatDateTime(row.occurred_at, locale));

  const metadataLine = formatLoginDeviceMetadata(row.metadata, isTh);
  if (metadataLine) {
    lines.push(metadataLine);
  }

  if (row.access_level) {
    lines.push(
      row.access_level === "read_only"
        ? isTh
          ? "สิทธิ์: ดูอย่างเดียว"
          : "Access: view only"
        : isTh
          ? "สิทธิ์: แก้ไขได้"
          : "Access: can edit"
    );
  }

  if (row.ip_address) {
    lines.push(isTh ? `จากเครือข่าย ${row.ip_address}` : `From ${row.ip_address}`);
  }

  if (row.failure_reason) {
    lines.push(localizeFailureReason(row.failure_reason, isTh));
  }

  return lines;
}

function LoginEntry({ row, locale }: { row: LoginHistoryRow; locale: string }) {
  const isTh = locale === "th";
  const isFailure = row.status !== "success";
  const lines = buildLoginLines(row, locale, isTh);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3.5 py-3 bb-transition",
        isFailure
          ? "border-red-500/15 bg-red-500/[0.04]"
          : "border-black/5 dark:border-white/10 bg-card"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          isFailure ? "bg-red-500/10 text-red-500" : "bg-muted text-foreground/70"
        )}
      >
        <EventIcon type={row.event_type} size={14} strokeWidth={1.75} />
      </div>
      <ExpandableLines
        lines={lines}
        isTh={isTh}
        className="min-w-0 flex-1"
        firstLineClassName="text-[13px] text-foreground font-normal leading-snug"
      />
    </div>
  );
}

export default function LoginHistorySection({ locale }: LoginHistorySectionProps) {
  const [rows, setRows] = useState<LoginHistoryRow[]>([]);
  const [sessions, setSessions] = useState<ActiveLoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const isTh = locale === "th";

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchLoginHistoryBundle(200);
    if (!result.success) {
      setError(result.error);
      setRows([]);
      setSessions([]);
    } else {
      setError(null);
      setRows(result.rows);
      setSessions(result.sessions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const result = await fetchLoginHistoryBundle(200);
      if (cancelled) return;

      if (!result.success) {
        setError(result.error);
        setRows([]);
        setSessions([]);
      } else {
        setError(null);
        setRows(result.rows);
        setSessions(result.sessions);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRows = showAll ? rows : rows.slice(0, PREVIEW_COUNT);
  const hasMoreRows = rows.length > PREVIEW_COUNT;

  return (
    <div className="space-y-3">
      <ActiveRemoteSessionsPanel
        locale={locale}
        sessions={sessions}
        loading={loading}
        loadError={error}
        onReload={load}
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="py-4 text-center space-y-2">
          <p className="text-[13px] leading-relaxed text-red-500 font-normal">
            {isTh ? "โหลดประวัติไม่ได้" : "Could not load history"}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-[12px] text-foreground underline-offset-2 hover:underline"
          >
            {isTh ? "ลองใหม่" : "Try again"}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground font-normal py-4 text-center">
          {isTh ? "ยังไม่มีประวัติการเข้าสู่ระบบ" : "No sign-in history yet"}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleRows.map((row) => (
            <LoginEntry key={row.id} row={row} locale={locale} />
          ))}
          {hasMoreRows && (
            <ExpandMoreButton
              expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
              isTh={isTh}
              moreLabel={isTh ? "ดูรายละเอียด" : "View details"}
              lessLabel={isTh ? "ย่อรายการ" : "Show less"}
              className="mt-1"
            />
          )}
        </div>
      )}
    </div>
  );
}
