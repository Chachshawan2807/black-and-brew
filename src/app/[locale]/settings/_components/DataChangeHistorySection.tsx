"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Layers } from '@/lib/icons';
import { cn } from "@/lib/utils";
import {
  fetchDataChangeLogs,
  type DataChangeLogRow,
} from "@/app/actions/data-change-log-actions";
import {
  formatDataChangeLogDisplay,
} from "@/lib/inventory-notification-formatter";
import { ExpandMoreButton } from "@/components/ui/expand-more-button";
import {
  SETTINGS_BTN_GHOST,
  SETTINGS_CHIP_IDLE,
  SETTINGS_CHIP_SELECTED,
  SETTINGS_ENTRY,
  SETTINGS_ENTRY_DANGER,
  SETTINGS_EXPAND_BTN,
  SettingsIconBadge,
} from "./settings-ui-primitives";

interface DataChangeHistorySectionProps {
  locale: string;
}

const PREVIEW_COUNT = 3;

const MODULE_LABELS: Record<string, { th: string; en: string }> = {
  inventory: { th: "คลังสินค้า", en: "Inventory" },
  schedule: { th: "ตารางงาน", en: "Schedule" },
  maintenance: { th: "ซ่อมบำรุง", en: "Maintenance" },
  holiday: { th: "วันหยุด", en: "Holidays" },
  dashboard: { th: "แดชบอร์ด", en: "Dashboard" },
  settings: { th: "ตั้งค่า", en: "Settings" },
};

function ActionIcon({
  action,
  size,
  strokeWidth,
}: {
  action: string;
  size: number;
  strokeWidth: number;
}) {
  const props = { size, strokeWidth };
  switch (action) {
    case "CREATE":
      return <Plus {...props} />;
    case "DELETE":
    case "BULK_DELETE":
      return <Trash2 {...props} />;
    case "BULK_UPDATE":
      return <Layers {...props} />;
    case "UPDATE":
    default:
      return <Pencil {...props} />;
  }
}

function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

function buildChangeLines(row: DataChangeLogRow, locale: string): string[] {
  const isTh = locale === "th";
  const { headline, detail } = formatDataChangeLogDisplay(row, locale);

  const editedAtLabel = isTh ? "แก้ไขเมื่อ" : "Edited on";
  const metaParts = [row.actor_label, editedAtLabel, formatDateTime(row.occurred_at, isTh ? "th" : "en")].filter(
    Boolean
  ) as string[];

  const detailLine =
    row.status === "failed"
      ? row.error_message ?? (isTh ? "บันทึกไม่สำเร็จ" : "Save failed")
      : detail;

  const lines = [headline, detailLine, metaParts.join(" · ")];

  if (row.ip_address) {
    lines.push(isTh ? `จากเครือข่าย ${row.ip_address}` : `From ${row.ip_address}`);
  }

  return lines;
}

const HISTORY_LINE_STYLES = [
  "text-[13px] text-foreground font-normal leading-snug",
  "text-[12px] text-muted-foreground/90 leading-normal",
  "text-[12px] text-muted-foreground/90 leading-normal",
  "text-[12px] text-muted-foreground/90 leading-normal",
] as const;

function LogEntry({ row, locale }: { row: DataChangeLogRow; locale: string }) {
  const isFailed = row.status === "failed";
  const lines = buildChangeLines(row, locale);

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isFailed ? SETTINGS_ENTRY_DANGER : SETTINGS_ENTRY,
      )}
    >
      <SettingsIconBadge size="md" tone={isFailed ? 'danger' : 'neutral'}>
        <ActionIcon action={row.action} size={14} strokeWidth={1.75} />
      </SettingsIconBadge>
      <div className="min-w-0 flex-1">
        {lines.map((line, i) => (
          <p
            key={i}
            className={cn(HISTORY_LINE_STYLES[i] ?? HISTORY_LINE_STYLES[3], i > 0 && "mt-0.5")}
          >
            {line}
          </p>
        ))}
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
  const [showAll, setShowAll] = useState(false);
  const isTh = locale === "th";
  const loadGenRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    const result = await fetchDataChangeLogs({
      limit: 50,
      module: moduleFilter === "all" ? undefined : moduleFilter,
    });
    if (gen !== loadGenRef.current) return;

    if (!result.success) {
      setError(result.error);
      setRows([]);
    } else {
      setError(null);
      setRows(result.rows);
    }
    setLoading(false);
  }, [moduleFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [moduleFilter, load]);

  const filterOptions = [
    { value: "all", label: isTh ? "ทั้งหมด" : "All" },
    ...Object.entries(MODULE_LABELS).map(([value, labels]) => ({
      value,
      label: isTh ? labels.th : labels.en,
    })),
  ];

  const visibleRows = showAll ? rows : rows.slice(0, PREVIEW_COUNT);
  const hasMoreRows = rows.length > PREVIEW_COUNT;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={isTh ? "กรองตามโมดูล" : "Filter by module"}>
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={moduleFilter === opt.value}
            onClick={() => {
              setModuleFilter(opt.value);
              setShowAll(false);
            }}
            className={cn(
              moduleFilter === opt.value ? SETTINGS_CHIP_SELECTED : SETTINGS_CHIP_IDLE,
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

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
            className={SETTINGS_BTN_GHOST}
          >
            {isTh ? "ลองใหม่" : "Try again"}
          </button>
        </div>
      ) : rows.length === 0 ? (
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
              className={SETTINGS_EXPAND_BTN}
            />
          )}
        </>
      )}
    </div>
  );
}
