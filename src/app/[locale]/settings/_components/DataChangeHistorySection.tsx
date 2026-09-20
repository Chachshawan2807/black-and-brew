"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Layers } from '@/lib/icons';
import { cn } from "@/lib/utils";
import {
  type DataChangeLogRow,
} from "@/app/actions/data-change-log-actions";
import {
  EDIT_HISTORY_INITIAL_LIMIT,
  getOrFetchEditHistory,
} from "@/lib/settings-section-data-cache";
import {
  formatDataChangeLogDisplay,
} from "@/lib/inventory-notification-formatter";
import { formatDataChangeHistoryMeta } from "@/lib/data-change-history-display";
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

const INITIAL_VISIBLE_COUNT = 3;
const LOAD_MORE_COUNT = 5;

const MODULE_LABELS: Record<string, { th: string; en: string }> = {
  inventory: { th: "คลังสินค้า", en: "Inventory" },
  schedule: { th: "ตารางงาน", en: "Schedule" },
  maintenance: { th: "ซ่อมบำรุง", en: "Maintenance" },
  holiday: { th: "วันหยุด", en: "Holidays" },
  dashboard: { th: "แดชบอร์ด", en: "Dashboard" },
  settings: { th: "ตั้งค่า", en: "Settings" },
  bean_orders: { th: "ออเดอร์เมล็ด", en: "Bean orders" },
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

function buildChangeLines(row: DataChangeLogRow, locale: string): string[] {
  const isTh = locale === "th";
  const { headline, detail, detailLines } = formatDataChangeLogDisplay(row, locale);

  const contentLines =
    row.status === "failed"
      ? [row.error_message ?? (isTh ? "บันทึกไม่สำเร็จ" : "Save failed")]
      : detailLines && detailLines.length > 0
        ? detailLines
        : detail
          ? [detail]
          : [];

  return [headline, ...contentLines, formatDataChangeHistoryMeta(row, locale)];
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
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const isTh = locale === "th";
  const loadGenRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    const historyModule = moduleFilter === "all" ? undefined : moduleFilter;
    const result = await getOrFetchEditHistory({
      limit: EDIT_HISTORY_INITIAL_LIMIT,
      module: historyModule,
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
    void load();
  }, [moduleFilter, load]);

  const filterOptions = [
    { value: "all", label: isTh ? "ทั้งหมด" : "All" },
    ...Object.entries(MODULE_LABELS).map(([value, labels]) => ({
      value,
      label: isTh ? labels.th : labels.en,
    })),
  ];

  const visibleRows = rows.slice(0, visibleCount);
  const hasMoreRows = visibleCount < rows.length;
  const canCollapse = visibleCount > INITIAL_VISIBLE_COUNT;

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
              setVisibleCount(INITIAL_VISIBLE_COUNT);
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
          {(hasMoreRows || canCollapse) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {hasMoreRows ? (
                <ExpandMoreButton
                  expanded={false}
                  onClick={() =>
                    setVisibleCount((count) =>
                      Math.min(count + LOAD_MORE_COUNT, rows.length),
                    )
                  }
                  isTh={isTh}
                  moreLabel={isTh ? "ดูเพิ่มเติม" : "Show more"}
                  className={SETTINGS_EXPAND_BTN}
                />
              ) : null}
              {canCollapse ? (
                <ExpandMoreButton
                  expanded={true}
                  onClick={() => setVisibleCount(INITIAL_VISIBLE_COUNT)}
                  isTh={isTh}
                  lessLabel={isTh ? "ย่อรายการ" : "Show less"}
                  className={SETTINGS_EXPAND_BTN}
                />
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
