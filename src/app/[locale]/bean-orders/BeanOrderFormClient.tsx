'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import {
  createBeanCustomer,
  createBeanOrder,
  DEFAULT_SHOP_SENDER,
  fetchBeanCustomerAddresses,
  searchBeanCustomers,
  type BeanCustomerRow,
} from '@/app/actions/bean-order-actions';
import { computeOrderTotals } from '@/lib/bean-orders/pricing';
import type { WeightUnit } from '@/lib/bean-orders/types';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

type InventoryItem = { id: string; name: string };

type LineDraft = {
  key: string;
  inventoryItemId: string;
  weightValue: string;
  weightUnit: WeightUnit;
  unitPricePerKg: string;
};

type Props = {
  inventoryItems: InventoryItem[];
  locale: string;
};

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    inventoryItemId: '',
    weightValue: '',
    weightUnit: 'g',
    unitPricePerKg: '',
  };
}

function sanitizeNum(raw: string): string {
  return raw.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '');
}

export default function BeanOrderFormClient({ inventoryItems, locale }: Props) {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<BeanCustomerRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<BeanCustomerRow | null>(null);

  const [senderName, setSenderName] = useState<string>(DEFAULT_SHOP_SENDER.name);
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientProvince, setRecipientProvince] = useState('');
  const [recipientPostalCode, setRecipientPostalCode] = useState('');

  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [discountBaht, setDiscountBaht] = useState('');
  const [shippingBaht, setShippingBaht] = useState('');
  const [notes, setNotes] = useState('');

  const totals = useMemo(() => {
    const parsedLines = lines
      .filter((l) => l.inventoryItemId && l.weightValue && l.unitPricePerKg)
      .map((l) => ({
        inventoryItemId: l.inventoryItemId,
        weightValue: Number(l.weightValue) || 0,
        weightUnit: l.weightUnit,
        unitPricePerKg: Number(l.unitPricePerKg) || 0,
      }));
    return computeOrderTotals(
      parsedLines,
      Number(discountBaht) || 0,
      Number(shippingBaht) || 0,
    );
  }, [lines, discountBaht, shippingBaht]);

  async function handleCustomerSearch(q: string) {
    setCustomerQuery(q);
    if (!q.trim()) {
      setCustomerResults([]);
      return;
    }
    const result = await searchBeanCustomers(q);
    if (result.success) setCustomerResults(result.data ?? []);
  }

  async function handleSelectCustomer(customer: BeanCustomerRow) {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name);
    setCustomerResults([]);
    const addr = await fetchBeanCustomerAddresses(customer.id);
    if (addr.success && addr.data?.[0]) {
      const a = addr.data[0];
      setRecipientName(a.recipientName);
      setRecipientPhone(a.recipientPhone ?? '');
      setRecipientAddress(a.addressLine);
      setRecipientProvince(a.province ?? '');
      setRecipientPostalCode(a.postalCode ?? '');
    }
  }

  async function handleCreateCustomer() {
    if (!customerQuery.trim()) return;
    const result = await createBeanCustomer({ name: customerQuery.trim() });
    if (result.success && result.data) {
      setSelectedCustomer(result.data);
      setCustomerResults([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) {
      setError(READ_ONLY_DENY_MSG);
      return;
    }
    setSaving(true);
    setError(null);

    const parsedLines = lines
      .filter((l) => l.inventoryItemId && l.weightValue && l.unitPricePerKg)
      .map((l) => ({
        inventoryItemId: l.inventoryItemId,
        weightValue: Number(l.weightValue),
        weightUnit: l.weightUnit,
        unitPricePerKg: Number(l.unitPricePerKg),
      }));

    const result = await createBeanOrder(
      {
        customerId: selectedCustomer?.id ?? null,
        senderName,
        senderPhone,
        senderAddress,
        recipientName,
        recipientPhone,
        recipientAddress,
        recipientProvince,
        recipientPostalCode,
        discountBaht: Number(discountBaht) || 0,
        shippingBaht: Number(shippingBaht) || 0,
        notes,
        lines: parsedLines,
      },
      locale,
    );

    setSaving(false);
    if (!result.success || !result.orderId) {
      setError(result.error ?? 'สร้างออเดอร์ไม่สำเร็จ');
      return;
    }
    router.push(`/${locale}/bean-orders/${result.orderId}`);
  }

  const inputClass =
    'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20';

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Link href={`/${locale}/bean-orders`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> กลับรายการ
      </Link>
      <h1 className="text-2xl font-normal mb-6">สร้างออเดอร์เมล็ดกาแฟ</h1>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-normal text-muted-foreground">ลูกค้า</h2>
        <input
          className={inputClass}
          value={customerQuery}
          onChange={(e) => void handleCustomerSearch(e.target.value)}
          placeholder="ค้นหาหรือพิมพ์ชื่อลูกค้าใหม่"
        />
        {customerResults.length > 0 && (
          <ul className="rounded-xl border border-border divide-y">
            {customerResults.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => void handleSelectCustomer(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-muted/30">
                  {c.name} {c.phone ? `· ${c.phone}` : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!selectedCustomer && customerQuery.trim() && (
          <button type="button" onClick={() => void handleCreateCustomer()} className="text-sm text-foreground underline">
            สร้างลูกค้าใหม่ "{customerQuery.trim()}"
          </button>
        )}
      </section>

      <section className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-normal text-muted-foreground">ผู้ส่ง</h2>
        <input className={inputClass} value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="ชื่อผู้ส่ง" />
        <input className={inputClass} value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="เบอร์โทร" />
        <textarea className={cn(inputClass, 'h-20 py-2')} value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} placeholder="ที่อยู่ผู้ส่ง" />
      </section>

      <section className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-normal text-muted-foreground">ผู้รับ</h2>
        <input className={inputClass} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="ชื่อผู้รับ" required />
        <input className={inputClass} value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="เบอร์โทร" />
        <textarea className={cn(inputClass, 'h-20 py-2')} value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} placeholder="ที่อยู่ผู้รับ" required />
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} value={recipientProvince} onChange={(e) => setRecipientProvince(e.target.value)} placeholder="จังหวัด" />
          <input className={inputClass} value={recipientPostalCode} onChange={(e) => setRecipientPostalCode(e.target.value)} placeholder="รหัสไปรษณีย์" />
        </div>
      </section>

      <section className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-normal text-muted-foreground">รายการสินค้า</h2>
          <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} className="inline-flex items-center gap-1 text-sm">
            <Plus className="h-4 w-4" /> เพิ่มรายการ
          </button>
        </div>
        {lines.map((line, index) => (
          <div key={line.key} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
            <select
              className={inputClass}
              value={line.inventoryItemId}
              onChange={(e) =>
                setLines((prev) => prev.map((l, i) => (i === index ? { ...l, inventoryItemId: e.target.value } : l)))
              }
              required
            >
              <option value="">เลือกสินค้า</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                className={cn(inputClass, 'flex-1')}
                value={line.weightValue}
                onChange={(e) =>
                  setLines((prev) => prev.map((l, i) => (i === index ? { ...l, weightValue: sanitizeNum(e.target.value) } : l)))
                }
                placeholder="น้ำหนัก"
                inputMode="decimal"
                required
              />
              <select
                className={cn(inputClass, 'w-24')}
                value={line.weightUnit}
                onChange={(e) =>
                  setLines((prev) => prev.map((l, i) => (i === index ? { ...l, weightUnit: e.target.value as WeightUnit } : l)))
                }
              >
                <option value="g">ก.</option>
                <option value="kg">กก.</option>
              </select>
            </div>
            <input
              className={inputClass}
              value={line.unitPricePerKg}
              onChange={(e) =>
                setLines((prev) => prev.map((l, i) => (i === index ? { ...l, unitPricePerKg: sanitizeNum(e.target.value) } : l)))
              }
              placeholder="ราคา/กก. (บาท)"
              inputMode="decimal"
              required
            />
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                className="inline-flex h-11 items-center justify-center gap-1 text-sm text-red-600"
              >
                <Trash2 className="h-4 w-4" /> ลบ
              </button>
            )}
          </div>
        ))}
      </section>

      <section className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-normal text-muted-foreground">สรุปยอด</h2>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputClass} value={discountBaht} onChange={(e) => setDiscountBaht(sanitizeNum(e.target.value))} placeholder="ส่วนลด (บาท)" inputMode="decimal" />
          <input className={inputClass} value={shippingBaht} onChange={(e) => setShippingBaht(sanitizeNum(e.target.value))} placeholder="ค่าส่ง (บาท)" inputMode="decimal" />
        </div>
        <textarea className={cn(inputClass, 'h-20 py-2')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="หมายเหตุ" />
        <div className="rounded-xl bg-muted/30 p-3 text-sm space-y-1">
          <p>รวมสินค้า: {totals.subtotalBaht.toLocaleString('th-TH')} ฿</p>
          <p className="text-lg">ยอดรวม: {totals.totalBaht.toLocaleString('th-TH')} ฿</p>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving || isReadOnly}
        className="h-12 w-full rounded-full bg-foreground text-background text-sm disabled:opacity-50"
      >
        {saving ? 'กำลังบันทึก...' : 'บันทึกออเดอร์'}
      </button>
    </form>
  );
}
