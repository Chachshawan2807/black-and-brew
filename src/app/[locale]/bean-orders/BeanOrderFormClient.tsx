'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Clipboard, Plus, Trash2 } from 'lucide-react';
import {
  createBeanCustomer,
  createBeanOrder,
  fetchBeanCustomerAddresses,
  parseBeanOrderCustomerFromText,
  searchBeanCustomers,
  type BeanCustomerAddressRow,
  type BeanCustomerRow,
} from '@/app/actions/bean-order-actions';
import { AddressProfilePicker } from '@/app/[locale]/bean-orders/_components/AddressProfilePicker';
import { AutocompleteTextField } from '@/app/[locale]/bean-orders/_components/AutocompleteTextField';
import { PasteCustomerDialog } from '@/app/[locale]/bean-orders/_components/PasteCustomerDialog';
import {
  ThaiPostalAddressSection,
} from '@/app/[locale]/bean-orders/_components/ThaiPostalAddressSection';
import {
  emptyThaiPostalAddress,
  parseThaiPostalAddressLine,
  type ThaiPostalAddressValue,
} from '@/lib/bean-orders/address';
import { DEFAULT_SHOP_SENDER } from '@/lib/bean-orders/defaults';
import {
  filterNumberSuggestions,
  filterStringSuggestions,
  linePresetsForItem,
  profilesMatchingName,
  type BeanOrderFormSuggestions,
} from '@/lib/bean-orders/form-suggestions';
import type { ParsedBeanOrderCustomer } from '@/lib/bean-orders/parse-share-text';
import { computeOrderTotals } from '@/lib/bean-orders/pricing';
import {
  formatThaiPostalAddressLine,
  lookupThaiPostalAreas,
} from '@/lib/bean-orders/thai-postal-lookup';
import type { WeightUnit } from '@/lib/bean-orders/types';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';
import { BEAN_ORDER_CARD, BEAN_ORDER_DETAIL_PAGE, BEAN_ORDER_INPUT } from './_components/bean-order-layout';
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
  formSuggestions?: BeanOrderFormSuggestions;
  locale: string;
};

const EMPTY_SUGGESTIONS: BeanOrderFormSuggestions = {
  recipientProfiles: [],
  linePresets: [],
  shippingBahtValues: [],
  discountBahtValues: [],
  notes: [],
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

function recipientFromSavedAddress(input: BeanCustomerAddressRow): ThaiPostalAddressValue {
  return parseThaiPostalAddressLine(input.addressLine, {
    name: input.recipientName,
    phone: input.recipientPhone ?? '',
    province: input.province,
    postalCode: input.postalCode,
  });
}

function validatePostalAddress(
  label: string,
  value: ThaiPostalAddressValue,
): string | null {
  if (!value.postalCode) return null;
  const areas = lookupThaiPostalAreas(value.postalCode);
  if (areas.length > 0 && !value.areaId) {
    return `กรุณาเลือกพื้นที่สำหรับ${label}`;
  }
  return null;
}

export default function BeanOrderFormClient({
  inventoryItems,
  formSuggestions = EMPTY_SUGGESTIONS,
  locale,
}: Props) {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<BeanCustomerRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<BeanCustomerRow | null>(null);
  const [customerAddressPicker, setCustomerAddressPicker] = useState<ThaiPostalAddressValue[] | null>(null);

  const [recipient, setRecipient] = useState<ThaiPostalAddressValue>(() => emptyThaiPostalAddress());

  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [discountBaht, setDiscountBaht] = useState('');
  const [shippingBaht, setShippingBaht] = useState('');
  const [notes, setNotes] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteData, setPasteData] = useState<ParsedBeanOrderCustomer | null>(null);

  const customerNameSuggestions = useMemo(() => {
    const fromCustomers = customerResults.map((customer) => customer.name);
    const fromProfiles = formSuggestions.recipientProfiles
      .map((profile) => profile.name.trim())
      .filter((name) => name.toLowerCase().includes(customerQuery.trim().toLowerCase()));
    return filterStringSuggestions([...fromCustomers, ...fromProfiles], customerQuery);
  }, [customerQuery, customerResults, formSuggestions.recipientProfiles]);

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
    setRecipient((prev) => ({ ...prev, name: q }));
    setSelectedCustomer(null);
    setCustomerAddressPicker(null);
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
    if (!addr.success || !addr.data?.length) return;

    if (addr.data.length === 1) {
      setRecipient({
        ...recipientFromSavedAddress(addr.data[0]!),
        name: customer.name,
      });
      return;
    }

    setCustomerAddressPicker(
      addr.data.map((row) => ({
        ...recipientFromSavedAddress(row),
        name: customer.name,
      })),
    );
  }

  function handleCustomerNameSelect(name: string) {
    setCustomerQuery(name);
    const customer = customerResults.find((row) => row.name === name);
    if (customer) {
      void handleSelectCustomer(customer);
      return;
    }

    const profileMatches = profilesMatchingName(formSuggestions.recipientProfiles, name);
    if (profileMatches.length === 1) {
      setRecipient({ ...profileMatches[0]!, name });
      return;
    }
    if (profileMatches.length > 1) {
      setCustomerAddressPicker(profileMatches.map((profile) => ({ ...profile, name })));
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

  function applyLinePreset(
    index: number,
    preset: BeanOrderFormSuggestions['linePresets'][number],
  ) {
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              inventoryItemId: preset.inventoryItemId,
              weightValue: String(preset.weightValue),
              weightUnit: preset.weightUnit,
              unitPricePerKg: String(preset.unitPricePerKg),
            }
          : line,
      ),
    );
  }

  function handleRecipientChange(value: ThaiPostalAddressValue) {
    setRecipient(value);
    if (value.name !== customerQuery) {
      setCustomerQuery(value.name);
      setSelectedCustomer(null);
    }
  }

  function closePasteDialog() {
    setPasteOpen(false);
    setPasteLoading(false);
    setPasteError(null);
    setPasteData(null);
  }

  async function handlePasteCustomer() {
    if (isReadOnly) {
      setError(READ_ONLY_DENY_MSG);
      return;
    }

    setPasteOpen(true);
    setPasteLoading(true);
    setPasteError(null);
    setPasteData(null);

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteLoading(false);
        setPasteError('ไม่พบข้อความในคลิปบอร์ด');
        return;
      }

      const result = await parseBeanOrderCustomerFromText(text);
      setPasteLoading(false);
      if (!result.success || !result.data) {
        setPasteError(result.error ?? 'แยกข้อมูลลูกค้าไม่สำเร็จ');
        return;
      }
      setPasteData(result.data);
    } catch {
      setPasteLoading(false);
      setPasteError('ไม่สามารถอ่านคลิปบอร์ดได้');
    }
  }

  function applyPastedCustomer() {
    if (!pasteData) return;
    setCustomerQuery(pasteData.name);
    setSelectedCustomer(null);
    setCustomerResults([]);
    setCustomerAddressPicker(null);
    setRecipient({
      ...pasteData.address,
      name: pasteData.name,
      phone: pasteData.phone,
    });
    closePasteDialog();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) {
      setError(READ_ONLY_DENY_MSG);
      return;
    }
    setSaving(true);
    setError(null);

    const recipientError = validatePostalAddress('ลูกค้า', recipient);
    if (recipientError) {
      setSaving(false);
      setError(recipientError);
      return;
    }

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
        senderName: DEFAULT_SHOP_SENDER.name,
        senderPhone: '',
        senderAddress: '',
        recipientName: recipient.name.trim() || customerQuery.trim(),
        recipientPhone: recipient.phone,
        recipientAddress: formatThaiPostalAddressLine({
          addressLine: recipient.addressLine,
          subdistrict: recipient.subdistrict,
          district: recipient.district,
          province: recipient.province,
          postalCode: recipient.postalCode,
        }),
        recipientProvince: recipient.province || undefined,
        recipientPostalCode: recipient.postalCode || undefined,
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

  const inputClass = BEAN_ORDER_INPUT;

  return (
    <form onSubmit={handleSubmit} className={BEAN_ORDER_DETAIL_PAGE}>
      <Link href={`/${locale}/bean-orders`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> กลับรายการ
      </Link>
      <h1 className="text-2xl font-normal mb-6">สร้างออเดอร์เมล็ดกาแฟ</h1>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className={`${BEAN_ORDER_CARD} mb-5 space-y-3 p-4`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-normal text-muted-foreground">ลูกค้า</h2>
          <button
            type="button"
            onClick={() => void handlePasteCustomer()}
            disabled={isReadOnly || pasteLoading}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs text-foreground disabled:opacity-50"
          >
            <Clipboard className="h-3.5 w-3.5" aria-hidden />
            วางข้อมูลลูกค้า
          </button>
        </div>
        <AutocompleteTextField
          value={customerQuery}
          onChange={(q) => void handleCustomerSearch(q)}
          onSelect={handleCustomerNameSelect}
          suggestions={customerNameSuggestions}
          inputClass={inputClass}
          placeholder="ค้นหาหรือพิมพ์ชื่อลูกค้าใหม่"
        />
        {customerResults.length > 0 && (
          <ul className="rounded-xl border border-border divide-y">
            {customerResults.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => void handleSelectCustomer(c)} className="w-full px-3 py-2 text-left text-sm hover:bg-muted/30">
                  {c.name} {c.phone ? `/ ${c.phone}` : ''}
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
        {customerAddressPicker && (
          <AddressProfilePicker
            title="เลือกที่อยู่ของลูกค้า"
            profiles={customerAddressPicker}
            onSelect={(profile) => {
              handleRecipientChange(profile);
              setCustomerQuery(profile.name);
              setCustomerAddressPicker(null);
            }}
          />
        )}

        <ThaiPostalAddressSection
          title=""
          embedded
          value={recipient}
          onChange={handleRecipientChange}
          profiles={formSuggestions.recipientProfiles}
          inputClass={inputClass}
          nameRequired
          addressRequired
        />
      </section>

      <section className={`${BEAN_ORDER_CARD} mb-5 p-4`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs text-muted-foreground">รายการสินค้า</h2>
          <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm hover:bg-muted/30">
            <Plus className="h-4 w-4" aria-hidden /> เพิ่มรายการ
          </button>
        </div>
        <div className="space-y-3">
        {lines.map((line, index) => {
          const weightSuggestions = linePresetsForItem(
            formSuggestions.linePresets,
            line.inventoryItemId,
            line.weightValue,
          ).map((preset) => String(preset.weightValue));
          const priceSuggestions = linePresetsForItem(
            formSuggestions.linePresets,
            line.inventoryItemId,
            line.unitPricePerKg,
          ).map((preset) => String(preset.unitPricePerKg));
          const linePresetOptions = linePresetsForItem(
            formSuggestions.linePresets,
            line.inventoryItemId,
            line.weightValue || line.unitPricePerKg,
          );

          return (
            <div
              key={line.key}
              className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
            >
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
                <AutocompleteTextField
                  value={line.weightValue}
                  onChange={(weightValue) =>
                    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, weightValue: sanitizeNum(weightValue) } : l)))
                  }
                  suggestions={filterStringSuggestions(weightSuggestions, line.weightValue)}
                  inputClass={cn(inputClass, 'flex-1')}
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
              <AutocompleteTextField
                value={line.unitPricePerKg}
                onChange={(unitPricePerKg) =>
                  setLines((prev) => prev.map((l, i) => (i === index ? { ...l, unitPricePerKg: sanitizeNum(unitPricePerKg) } : l)))
                }
                suggestions={filterStringSuggestions(priceSuggestions, line.unitPricePerKg)}
                inputClass={inputClass}
                placeholder="ราคา/กก. (บาท)"
                inputMode="decimal"
                required
              />
              {linePresetOptions.length > 0 && (
                <div className="sm:col-span-4">
                  <p className="mb-1.5 text-xs text-muted-foreground">รายการเดิมที่เคยสั่ง</p>
                  <ul className="divide-y rounded-xl border border-border">
                    {linePresetOptions.slice(0, 6).map((preset) => (
                      <li key={`${preset.inventoryItemId}-${preset.weightValue}-${preset.unitPricePerKg}`}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted/30"
                          onClick={() => applyLinePreset(index, preset)}
                        >
                          {preset.weightValue} {preset.weightUnit === 'kg' ? 'กก.' : 'ก.'} / {preset.unitPricePerKg.toLocaleString('th-TH')} ฿/กก.
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                  className="inline-flex h-11 items-center justify-center gap-1 self-center text-sm text-red-600 sm:col-start-4"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  <span className="sm:sr-only">ลบ</span>
                </button>
              )}
            </div>
          );
        })}
        </div>
      </section>

      <section className={`${BEAN_ORDER_CARD} mb-5 space-y-3 p-4`}>
        <h2 className="text-sm font-normal text-muted-foreground">สรุปยอด</h2>
        <div className="grid grid-cols-2 gap-2">
          <AutocompleteTextField
            value={discountBaht}
            onChange={setDiscountBaht}
            suggestions={filterNumberSuggestions(formSuggestions.discountBahtValues, discountBaht)}
            inputClass={inputClass}
            placeholder="ส่วนลด (บาท)"
            inputMode="decimal"
          />
          <AutocompleteTextField
            value={shippingBaht}
            onChange={setShippingBaht}
            suggestions={filterNumberSuggestions(formSuggestions.shippingBahtValues, shippingBaht)}
            inputClass={inputClass}
            placeholder="ค่าส่ง (บาท)"
            inputMode="decimal"
          />
        </div>
        <AutocompleteTextField
          value={notes}
          onChange={setNotes}
          suggestions={filterStringSuggestions(formSuggestions.notes, notes)}
          inputClass={inputClass}
          placeholder="หมายเหตุ"
          multiline
        />
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm">
          <p className="text-muted-foreground">
            รวมสินค้า <span className="tabular-nums text-foreground">{totals.subtotalBaht.toLocaleString('th-TH')} ฿</span>
          </p>
          <p className="text-base text-foreground">
            ยอดรวม <span className="tabular-nums">{totals.totalBaht.toLocaleString('th-TH')} ฿</span>
          </p>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving || isReadOnly}
        className="h-12 w-full rounded-full bg-foreground text-background text-sm disabled:opacity-50"
      >
        {saving ? 'กำลังบันทึก...' : 'บันทึกออเดอร์'}
      </button>

      <PasteCustomerDialog
        open={pasteOpen}
        loading={pasteLoading}
        error={pasteError}
        data={pasteData}
        onConfirm={applyPastedCustomer}
        onCancel={closePasteDialog}
      />
    </form>
  );
}
