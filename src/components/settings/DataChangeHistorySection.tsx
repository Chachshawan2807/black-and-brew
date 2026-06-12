"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchDataChangeLogs,
  type DataChangeLogRow,
} from "@/app/actions/data-change-log-actions";
import {
  filterChangesForDisplay,
  formatFieldChange,
} from "@/lib/inventory-notification-formatter";
import { ExpandableLines } from "@/components/ui/expandable-lines";
import { ExpandMoreButton } from "@/components/ui/expand-more-button";

interface DataChangeHistorySectionProps {
  locale: string;
}

const PREVIEW_COUNT = 3;

const MODULE_LABELS: Record<string, { th: string; en: string }> = {
  inventory: { th: "คลังสินค้า", en: "Inventory" },
  schedule: { th: "ตารางงาน", en: "Schedule" },
  sales: { th: "ยอดขาย", en: "Sales" },
  maintenance: { th: "ซ่อมบำรุง", en: "Maintenance" },
  holiday: { th: "วันหยุด", en: "Holidays" },
  dashboard: { th: "แดชบอร์ด", en: "Dashboard" },
  settings: { th: "ตั้งค่า", en: "Settings" },
  market_insights: { th: "ข้อมูลตลาด", en: "Market insights" },
};

const ACTION_LABELS: Record<string, { th: string; en: string }> = {
  CREATE: { th: "เพิ่ม", en: "Added" },
  UPDATE: { th: "แก้ไข", en: "Edited" },
  DELETE: { th: "ลบ", en: "Deleted" },
  BULK_UPDATE: { th: "แก้ไขหลายรายการ", en: "Bulk edit" },
  BULK_DELETE: { th: "ลบหลายรายการ", en: "Bulk delete" },
};

function actionIcon(action: string) {
  switch (action) {
    case "CREATE":
      return Plus;
    case "DELETE":
    case "BULK_DELETE":
      return Trash2;
    case "BULK_UPDATE":
      return Layers;
    case "UPDATE":
    default:
      return Pencil;
  }
}

function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

function accessLabel(level: string | null, isTh: boolean): string | null {
  if (!level) return null;
  if (level === "read_only") return isTh ? "ดูอย่างเดียว" : "View only";
  if (level === "full") return isTh ? "แก้ไขได้" : "Can edit";
  return isTh ? "ระบบ" : "System";
}

function buildChangeLines(row: DataChangeLogRow, isTh: boolean): string[] {
  const lines: string[] = [];
  const actionLabel = ACTION_LABELS[row.action]?.[isTh ? "th" : "en"] ?? row.action;
  const moduleLabel = MODULE_LABELS[row.module]?.[isTh ? "th" : "en"] ?? row.module;
  const itemName = row.entity_label;

  if (itemName) {
    lines.push(`${actionLabel}: ${itemName}`);
  } else {
    lines.push(`${actionLabel} · ${moduleLabel}`);
  }

  const changes = filterChangesForDisplay(row.field_changes ?? [])
    .filter((c) => c.field !== "name")
    .map((c) => formatFieldChange(c, isTh))
    .filter((t) => t.length > 0);

  lines.push(...changes);

  const access = accessLabel(row.actor_access_level, isTh);
  const metaParts = [row.actor_label, access, formatDateTime(row.occurred_at, isTh ? "th" : "en")].filter(
    Boolean
  ) as string[];
  lines.push(metaParts.join(" · "));

  if (row.status === "failed") {
    lines.push(
      row.error_message ??
        (isTh ? "บันทึกไม่สำเร็จ" : "Save failed")
    );
  }

  if (row.ip_address) {
    lines.push(isTh ? `จากเครือข่าย ${row.ip_address}` : `From ${row.ip_address}`);
  }

  return lines;
}

function LogEntry({ row, locale }: { row: DataChangeLogRow; locale: string }) {
  const isTh = locale === "th";
  const Icon = actionIcon(row.action);
  const isFailed = row.status === "failed";
  const lines = buildChangeLines(row, isTh);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3.5 py-3 bb-transition",
        isFailed
          ? "border-red-500/15 bg-red-500/[0.04]"
          : "border-black/5 dark:border-white/10 bg-card"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          isFailed ? "bg-red-500/10 text-red-500" : "bg-muted text-foreground/70"
        )}
      >
        <Icon size={14} strokeWidth={1.75} />
      </div>
      <ExpandableLines lines={lines} isTh={isTh} className="min-w-0 flex-1" />
    </div>
  );
}

export default function DataChangeHistorySection({
  locale,
}: DataChangeHistorySectionProps) {
  const [rows, setRows] = useState<DataChangeLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const isTh = locale === "th";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const result = await fetchDataChangeLogs({
        limit: 50,
        module: moduleFilter === "all" ? undefined : moduleFilter,
      });
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
  }, [moduleFilter]);

  useEffect(() => {
    setShowAll(false);
  }, [moduleFilter]);

  const filterOptions = [
    { value: "all", label: isTh ? "ทั้งหมด" : "All" },
    ...Object.entries(MODULE_LABELS).map(([value, labels]) => ({
      value,
      label: isTh ? labels.th : labels.en,
    })),
  ];

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-[13px] leading-relaxed text-red-500 font-normal py-4 text-center">
        {isTh ? "โหลดประวัติไม่ได้ ลองใหม่อีกครั้ง" : "Could not load history. Try again."}
      </p>
    );
  }

  const visibleRows = showAll ? rows : rows.slice(0, PREVIEW_COUNT);
  const hasMoreRows = rows.length > PREVIEW_COUNT;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setModuleFilter(opt.value)}
            className={cn(
              "rounded-full px-3 py-1 text-[12px] bb-transition border",
              moduleFilter === opt.value
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground font-normal py-6 text-center">
          {isTh ? "ยังไม่มีประวัติการแก้ไข" : "No edit history yet"}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {visibleRows.map((row) => (
              <LogEntry key={row.id} row={row} locale={locale} />
            ))}
          </div>
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
        </>
      )}
    </div>
  );
}
