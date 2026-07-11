import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, BarChart3, ChevronLeft, ClipboardCheck } from 'lucide-react';
import { checkAuth } from '@/app/actions/auth';
import { fetchInventoryAccuracyReport } from '@/app/actions/inventory-actions';
import { AccuracyGauge } from '@/app/[locale]/inventory/accuracy/_components/AccuracyGauge';
import { getAccuracyGaugeZone } from '@/lib/inventory-accuracy-gauge';
import { INVENTORY_QUICK_ACTION_COLORS } from '@/lib/shift-colors';

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const METRIC_CARD_BASE = 'rounded-3xl p-5 bb-shadow-sm';
const METRIC_LABEL_CLASS = 'text-[11px] uppercase tracking-[0.18em] text-black/60';

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
            <div className="rounded-2xl bg-[#dbeafe] p-3 text-black bb-shadow-sm bb-pastel-surface">
              <BarChart3 className="h-6 w-6" strokeWidth={1.6} />
            </div>
            <div>
              <h1 className="text-2xl font-normal tracking-[0.16em] text-foreground uppercase">
                รายงานความแม่นยำ
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                ความแม่นยำ เฉพาะรายการที่ตั้งค่าเป็นต้องเบิก รายการไม่ต้องเบิกจะไม่ถูกนำมาปนกับคะแนน
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
            <section>
              <div className={`${METRIC_CARD_BASE} ${INVENTORY_QUICK_ACTION_COLORS.order} p-4`}>
                <p className={METRIC_LABEL_CLASS}>ความแม่นยำ เฉพาะส่วนที่ต้องเบิก</p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <AccuracyGauge
                    accuracyPct={report.overall.accuracyPct ?? 0}
                    className="mx-auto shrink-0 sm:mx-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-3 py-2.5 text-center sm:text-left">
                        <p className="text-2xl font-normal tabular-nums text-black">
                          {report.overall.accuracyPct ?? 0}%
                        </p>
                        <p className="mt-0.5 text-sm text-black/70">
                          ระดับ{getAccuracyGaugeZone(report.overall.accuracyPct ?? 0).label}
                        </p>
                        <p className="mt-1 text-[11px] text-black/60">
                          จาก {report.overall.totalChecks} ครั้งที่ตรวจนับ
                        </p>
                      </div>
                      <div
                        className={`rounded-2xl px-3 py-2.5 ${INVENTORY_QUICK_ACTION_COLORS.out}`}
                      >
                        <p className="text-[10px] uppercase tracking-[0.14em] text-black/60">
                          ความคลาดเคลื่อนรวม
                        </p>
                        <p className="mt-1 text-2xl font-normal tabular-nums text-black">
                          {formatQty(report.overall.totalDiscrepancyQty)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-black/60">
                          หน่วย จากฐาน {formatQty(report.overall.totalComparedQty)} หน่วย
                        </p>
                      </div>
                      <div
                        className={`rounded-2xl px-3 py-2.5 ${INVENTORY_QUICK_ACTION_COLORS.in}`}
                      >
                        <p className="text-[10px] uppercase tracking-[0.14em] text-black/60">
                          ตรง 100%
                        </p>
                        <p className="mt-1 text-2xl font-normal tabular-nums text-black">
                          {report.overall.matchChecks}/{report.overall.totalChecks}
                        </p>
                        <p className="mt-0.5 text-[11px] text-black/60">
                          รายการที่ตรงทุกครั้ง
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 bb-shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-normal text-foreground">รายการที่คลาดเคลื่อนสูง</h2>
              </div>
              {report.highDiscrepancyItems.length === 0 ? (
                <div className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">
                  ยังไม่มีรายการต้องเบิกที่คลาดเคลื่อน
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className="hidden px-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem] md:gap-4"
                    aria-hidden="true"
                  >
                    <span>รายการสินค้า</span>
                    <span className="text-center">คลาดเคลื่อน</span>
                    <span className="text-right">ความแม่นยำ</span>
                  </div>
                  <div className="space-y-2">
                    {report.highDiscrepancyItems.map((item) => (
                      <div
                        key={item.itemId}
                        className="rounded-2xl border border-border bg-background p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem] md:items-center md:gap-4">
                          <div className="min-w-0">
                            <p className="font-normal text-foreground">{item.itemName || 'ไม่ทราบชื่อสินค้า'}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              ล่าสุด: ระบบ {formatQty(item.lastSystemStockQty ?? 0)} / นับได้{' '}
                              {formatQty(item.lastCountedQty ?? 0)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 md:justify-center md:border-0 md:pt-0">
                            <span className="shrink-0 text-xs text-muted-foreground md:hidden">คลาดเคลื่อน</span>
                            <span className="inline-flex min-w-[5.5rem] justify-center rounded-2xl bg-[#fff3cd] px-3 py-1.5 text-sm tabular-nums text-black bb-pastel-surface">
                              {formatQty(item.totalDiscrepancyQty)} หน่วย
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 md:justify-end md:border-0 md:pt-0">
                            <span className="shrink-0 text-xs text-muted-foreground md:hidden">ความแม่นยำ</span>
                            <span className="min-w-[3.5rem] text-right text-sm tabular-nums text-foreground">
                              {item.accuracyPct ?? 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-card p-5 bb-shadow-sm">
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
