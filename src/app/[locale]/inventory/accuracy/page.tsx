import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, BarChart3, ChevronLeft, ClipboardCheck } from 'lucide-react';
import { checkAuth } from '@/app/actions/auth';
import { fetchInventoryAccuracyReport } from '@/app/actions/inventory-actions';
import { INVENTORY_QUICK_ACTION_COLORS } from '@/lib/shift-colors';

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const METRIC_CARD_BASE = 'rounded-3xl p-5 shadow-sm';
const METRIC_LABEL_CLASS = 'text-[11px] uppercase tracking-[0.18em] text-black/60';
const METRIC_VALUE_CLASS = 'mt-3 text-4xl font-normal tabular-nums text-black';
const METRIC_NOTE_CLASS = 'mt-2 text-xs text-black/60';

export default async function InventoryAccuracyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, authed] = await Promise.all([params, checkAuth()]);
  if (!authed) {
    redirect(`/${locale}`);
  }

  const reportResult = await fetchInventoryAccuracyReport();
  const report = reportResult.success ? reportResult.data : null;

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-5 border-b border-border pb-5">
          <Link
            href={`/${locale}/inventory`}
            className="inline-flex w-fit items-center gap-1.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
            กลับไปคลังสินค้า
          </Link>
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#dbeafe] p-3 text-black shadow-sm bb-pastel-surface">
              <BarChart3 className="h-6 w-6" strokeWidth={1.6} />
            </div>
            <div>
              <h1 className="text-2xl font-normal tracking-[0.16em] text-foreground uppercase">
                รายงานความแม่นยำ
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                ความแม่นยำ เฉพาะรายการที่ตั้งค่าเป็นนับจริง รายการเช็คว่าพอใช้จะไม่ถูกนำมาปนกับคะแนน
              </p>
            </div>
          </div>
        </header>

        {!report ? (
          <section className="rounded-3xl border border-red-100 bg-card p-5 text-sm text-muted-foreground dark:border-red-500/20">
            ไม่สามารถโหลดรายงานความแม่นยำได้ในขณะนี้
          </section>
        ) : (
          <>
            <section className="grid gap-3 md:grid-cols-3">
              <div className={`${METRIC_CARD_BASE} ${INVENTORY_QUICK_ACTION_COLORS.order}`}>
                <p className={METRIC_LABEL_CLASS}>
                  ความแม่นยำ เฉพาะส่วนที่นับจริง
                </p>
                <p className={METRIC_VALUE_CLASS}>
                  {report.overall.accuracyPct ?? 0}%
                </p>
                <p className={METRIC_NOTE_CLASS}>
                  จาก {report.overall.totalChecks} ครั้งที่ตรวจนับ
                </p>
              </div>

              <div className={`${METRIC_CARD_BASE} ${INVENTORY_QUICK_ACTION_COLORS.out}`}>
                <p className={METRIC_LABEL_CLASS}>
                  ความคลาดเคลื่อนรวม
                </p>
                <p className={METRIC_VALUE_CLASS}>
                  {formatQty(report.overall.totalDiscrepancyQty)}
                </p>
                <p className={METRIC_NOTE_CLASS}>
                  หน่วย จากฐาน {formatQty(report.overall.totalComparedQty)} หน่วย
                </p>
              </div>

              <div className={`${METRIC_CARD_BASE} ${INVENTORY_QUICK_ACTION_COLORS.in}`}>
                <p className={METRIC_LABEL_CLASS}>
                  ตรง 100%
                </p>
                <p className={METRIC_VALUE_CLASS}>
                  {report.overall.matchChecks}/{report.overall.totalChecks}
                </p>
                <p className={METRIC_NOTE_CLASS}>
                  ใช้เป็นตัวช่วยดูรายการที่ตรง 100%
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-normal text-foreground">รายการที่คลาดเคลื่อนสูง</h2>
              </div>
              {report.highDiscrepancyItems.length === 0 ? (
                <div className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">
                  ยังไม่มีรายการนับจริงที่คลาดเคลื่อน
                </div>
              ) : (
                <div className="space-y-3">
                  {report.highDiscrepancyItems.map((item) => (
                    <div
                      key={item.itemId}
                      className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-normal text-foreground">{item.itemName || 'ไม่ทราบชื่อสินค้า'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          ล่าสุด: ระบบ {formatQty(item.lastSystemStockQty ?? 0)} / นับได้ {formatQty(item.lastCountedQty ?? 0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm tabular-nums">
                        <span className="rounded-2xl bg-[#fff3cd] px-3 py-1.5 text-black bb-pastel-surface">
                          คลาด {formatQty(item.totalDiscrepancyQty)} หน่วย
                        </span>
                        <span className="text-muted-foreground">{item.accuracyPct ?? 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="mt-0.5 h-5 w-5 text-foreground/40" />
                <p className="text-sm leading-6 text-muted-foreground">
                  ประวัติรับเข้า/นำออก/ปรับจำนวน ใช้เป็นหลักฐานและดูแนวโน้มเท่านั้น การลบหรือเคลียร์ประวัติย้อนหลังจะไม่เปลี่ยนยอดคงเหลือ
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
