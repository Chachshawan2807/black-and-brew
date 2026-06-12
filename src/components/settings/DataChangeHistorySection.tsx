"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchDataChangeLogs,
  type DataChangeLogRow,
} from "@/app/actions/data-change-log-actions";
import type { FieldChange } from "@/lib/data-change-log";

interface DataChangeHistorySectionProps {
  locale: string;
}

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
  CREATE: { th: "สร้าง", en: "Create" },
  UPDATE: { th: "แก้ไข", en: "Update" },
  DELETE: { th: "ลบ", en: "Delete" },
  BULK_UPDATE: { th: "แก้ไขหลายรายการ", en: "Bulk update" },
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

function formatValue(value: unknown, isTh: boolean): string {
  if (value === null || value === undefined || value === "") {
    return isTh ? "(ว่าง)" : "(empty)";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function FieldChangesList({
  changes,
  isTh,
}: {
  changes: FieldChange[];
  isTh: boolean;
}) {
  if (changes.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {changes.map((change) => (
        <li
          key={change.field}
          className="text-[12px] text-muted-foreground/90 leading-normal"
        >
          <span className="font-mono text-foreground/80">{change.field}</span>
          {": "}
          <span className="line-through opacity-70">
            {formatValue(change.old_value, isTh)}
          </span>
          {" → "}
          <span className="text-foreground/90">
            {formatValue(change.new_value, isTh)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function LogEntry({ row, locale }: { row: DataChangeLogRow; locale: string }) {
  const [expanded, setExpanded] = useState(false);
  const isTh = locale === "th";
  const Icon = actionIcon(row.action);
  const isFailed = row.status === "failed";
  const moduleLabel =
    MODULE_LABELS[row.module]?.[isTh ? "th" : "en"] ?? row.module;
  const actionLabel =
    ACTION_LABELS[row.action]?.[isTh ? "th" : "en"] ?? row.action;
  const hasDetails =
    (row.field_changes?.length ?? 0) > 0 || row.entity_label || row.error_message;

  return (
    <div
      className={cn(
        "rounded-2xl border px-3.5 py-3.5 bb-transition",
        isFailed
          ? "border-red-500/15 bg-red-500/[0.04]"
          : "border-black/5 dark:border-white/10 bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isFailed ? "bg-red-500/10 text-red-500" : "bg-muted text-foreground/70"
          )}
        >
          <Icon size={16} strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[14px] font-normal text-foreground leading-snug">
                {actionLabel}
                {row.entity_label ? ` · ${row.entity_label}` : ""}
              </p>
              <p className="text-[12px] text-muted-foreground/90 mt-0.5">
                {moduleLabel} · {row.entity_type}
              </p>
            </div>
            <time className="shrink-0 text-[12px] text-muted-foreground/90 whitespace-nowrap leading-normal">
              {formatDateTime(row.occurred_at, locale)}
            </time>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground/85 leading-normal">
            <span>{row.actor_label}</span>
            {row.actor_access_level && (
              <span>
                {row.actor_access_level === "read_only"
                  ? isTh
                    ? "อ่านอย่างเดียว"
                    : "Read-only"
                  : row.actor_access_level === "full"
                    ? isTh
                      ? "สิทธิ์แก้ไข"
                      : "Full access"
                    : isTh
                      ? "ระบบ"
                      : "System"}
              </span>
            )}
            {row.ip_address && <span>IP {row.ip_address}</span>}
          </div>

          {!expanded && row.field_changes?.length > 0 && (
            <p className="mt-1.5 text-[12px] text-muted-foreground/90 truncate">
              {row.field_changes
                .slice(0, 2)
                .map((c) => c.field)
                .join(", ")}
              {row.field_changes.length > 2 ? "…" : ""}
            </p>
          )}

          {expanded && (
            <>
              <FieldChangesList changes={row.field_changes ?? []} isTh={isTh} />
              {row.error_message && (
                <p className="mt-2 text-[12px] text-red-500/80">{row.error_message}</p>
              )}
            </>
          )}

          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground bb-transition"
            >
              <ChevronDown
                size={13}
                className={cn("bb-transition", expanded && "rotate-180")}
              />
              {expanded
                ? isTh
                  ? "ซ่อนรายละเอียด"
                  : "Hide details"
                : isTh
                  ? "ดูรายละเอียด"
                  : "View details"}
            </button>
          )}
        </div>
      </div>
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
        <p className="text-[14px] leading-relaxed text-muted-foreground font-normal py-8 text-center">
          {isTh ? "ยังไม่มีประวัติการแก้ไขข้อมูล" : "No data change history yet"}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <LogEntry key={row.id} row={row} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
