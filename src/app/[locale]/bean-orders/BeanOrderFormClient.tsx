'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Clipboard, Plus, Trash2 } from 'lucide-react';
import {
  createBeanCustomer,
  createBeanOrder,
  confirmBeanOrderPayment,
  fetchBeanCustomerAddresses,
  parseBeanOrderCustomerFromText,
  revertBeanOrderPayment,
  searchBeanCustomers,
  shipBeanOrder,
  updateBeanOrder,
  uploadBeanOrderSlip,
  type BeanCustomerAddressRow,
  type BeanCustomerRow,
  type BeanOrderDetail,
} from '@/app/actions/bean-order-actions';
import { AddressProfilePickerDialog } from '@/app/[locale]/bean-orders/_components/AddressProfilePickerDialog';
import { AutocompleteTextField } from '@/app/[locale]/bean-orders/_components/AutocompleteTextField';
import { BeanOrderSelect } from '@/app/[locale]/bean-orders/_components/BeanOrderSelect';
import { BeanOrderPaymentFields } from '@/app/[locale]/bean-orders/_components/BeanOrderPaymentFields';
import { BeanOrderShippingFields } from '@/app/[locale]/bean-orders/_components/BeanOrderShippingFields';
import { PasteCustomerDialog } from '@/app/[locale]/bean-orders/_components/PasteCustomerDialog';
import { ClearCustomerConfirmDialog } from '@/app/[locale]/bean-orders/_components/ClearCustomerConfirmDialog';
import {
  ThaiPostalAddressSection,
} from '@/app/[locale]/bean-orders/_components/ThaiPostalAddressSection';
import {
  emptyThaiPostalAddress,
  parseThaiPostalAddressLine,
  type ThaiPostalAddressValue,
} from '@/lib/bean-orders/address';
import { mergeCustomerAddressProfiles } from '@/lib/bean-orders/customer-address-persist';
import { DEFAULT_SHOP_SENDER } from '@/lib/bean-orders/defaults';
import {
  initialCarrierSelection,
  OTHER_CARRIER_CODE,
  resolveCarrierCodeForSave,
} from '@/lib/bean-orders/carriers';
import {
  normalizeBeanOrderLinesForSave,
  resolveBeanOrderRecipientName,
} from '@/lib/bean-orders/order-input-normalize';
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
import type { PaymentStatus, WeightUnit } from '@/lib/bean-orders/types';
import { READ_ONLY_DENY_MSG, useReadOnly } from '@/components/providers/AuthProvider';
import {
  BEAN_ORDER_CARD,
  BEAN_ORDER_BTN_DANGER_GHOST,
  BEAN_ORDER_BTN_LIST,
  BEAN_ORDER_BTN_PASTEL_FULL,
  BEAN_ORDER_BTN_PRIMARY_FULL,
  BEAN_ORDER_BTN_SM_DANGER,
  BEAN_ORDER_BTN_SM_OUTLINE,
  BEAN_ORDER_FORM_FULFILLMENT_GRID,
  BEAN_ORDER_FORM_FULFILLMENT_CARD,
  BEAN_ORDER_FORM_FULFILLMENT_CARD_BODY,
  BEAN_ORDER_FORM_FULFILLMENT_COLUMN,
  BEAN_ORDER_FORM_LINE_GRID,
  BEAN_ORDER_FORM_MAIN_GRID,
  BEAN_ORDER_FORM_PAGE,
  BEAN_ORDER_FORM_PANEL,
  BEAN_ORDER_FORM_SECTION,
  BEAN_ORDER_INPUT,
} from './_components/bean-order-layout';
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
  mode?: 'create' | 'edit';
  orderId?: string;
  initialOrder?: BeanOrderDetail;
};

function orderToRecipient(order: BeanOrderDetail): ThaiPostalAddressValue {
  return parseThaiPostalAddressLine(order.recipientAddress, {
    name: order.recipientName,
    phone: order.recipientPhone ?? '',
    province: order.recipientProvince,
    postalCode: order.recipientPostalCode,
  });
}

function orderToLines(order: BeanOrderDetail): LineDraft[] {
  if (order.lines.length === 0) return [emptyLine()];
  return order.lines.map((line) => ({
    key: line.id,
    inventoryItemId: line.inventoryItemId ?? '',
    weightValue: String(line.weightValue),
    weightUnit: line.weightUnit,
    unitPricePerKg: String(line.unitPricePerKg),
  }));
}

function initialCustomer(order?: BeanOrderDetail): BeanCustomerRow | null {
  if (!order?.customerId || !order.customerName) return null;
  return {
    id: order.customerId,
    name: order.customerName,
    phone: order.recipientPhone,
    notes: null,
  };
}

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
    weightUnit: 'kg',
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
  mode = 'create',
  orderId,
  initialOrder,
}: Props) {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const isEdit = mode === 'edit' && Boolean(orderId && initialOrder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerQuery, setCustomerQuery] = useState(
    () => initialOrder?.customerName ?? initialOrder?.recipientName ?? '',
  );
  const [customerResults, setCustomerResults] = useState<BeanCustomerRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<BeanCustomerRow | null>(
    () => initialCustomer(initialOrder),
  );
  const [customerAddressPicker, setCustomerAddressPicker] = useState<ThaiPostalAddressValue[] | null>(null);

  const [recipient, setRecipient] = useState<ThaiPostalAddressValue>(() => {
    if (!initialOrder) return emptyThaiPostalAddress();
    return { ...orderToRecipient(initialOrder), name: '' };
  });

  const [lines, setLines] = useState<LineDraft[]>(() =>
    initialOrder ? orderToLines(initialOrder) : [emptyLine()],
  );
  const [discountBaht, setDiscountBaht] = useState(
    () => (initialOrder ? String(initialOrder.discountBaht || '') : ''),
  );
  const [shippingBaht, setShippingBaht] = useState(
    () => (initialOrder ? String(initialOrder.shippingBaht || '') : ''),
  );
  const [notes, setNotes] = useState(() => initialOrder?.notes ?? '');
  const initialCarrier = initialCarrierSelection(initialOrder?.shipment?.carrierCode);
  const [carrierCode, setCarrierCode] = useState(initialCarrier.carrierCode);
  const [customCarrierLabel, setCustomCarrierLabel] = useState(initialCarrier.customCarrierLabel);
  const [trackingNumber, setTrackingNumber] = useState(
    () => initialOrder?.shipment?.trackingNumber ?? '',
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    () => initialOrder?.paymentStatus ?? 'unpaid',
  );
  const [pendingSlipFile, setPendingSlipFile] = useState<File | null>(null);
  const [pendingSlipPreview, setPendingSlipPreview] = useState<string | null>(null);
  const [confirmPaymentOnSave, setConfirmPaymentOnSave] = useState(false);
  const [revertPaymentOnSave, setRevertPaymentOnSave] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteData, setPasteData] = useState<ParsedBeanOrderCustomer | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  useEffect(() => {
    if (!pendingSlipFile) {
      setPendingSlipPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(pendingSlipFile);
    setPendingSlipPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [pendingSlipFile]);

  const customerNameSuggestions = useMemo(() => {
    const fromCustomers = customerResults.map((customer) => customer.name);
    const fromProfiles = formSuggestions.recipientProfiles
      .map((profile) => profile.name.trim())
      .filter((name) => name.toLowerCase().includes(customerQuery.trim().toLowerCase()));
    return filterStringSuggestions([...fromCustomers, ...fromProfiles], customerQuery);
  }, [customerQuery, customerResults, formSuggestions.recipientProfiles]);

  const totals = useMemo(() => {
    const parsedLines = lines
      .filter((l) => l.inventoryItemId)
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
    setSelectedCustomer(null);
    setCustomerAddressPicker(null);
    if (!q.trim()) {
      setCustomerResults([]);
      return;
    }
    const result = await searchBeanCustomers(q);
    if (result.success) setCustomerResults(result.data ?? []);
  }

  async function resolveCustomerByName(name: string): Promise<BeanCustomerRow | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const local = customerResults.find((row) => row.name.trim() === trimmed);
    if (local) return local;

    const result = await searchBeanCustomers(trimmed);
    if (!result.success || !result.data?.length) return null;

    return (
      result.data.find((row) => row.name.trim() === trimmed) ??
      result.data.find((row) => row.name.trim().toLowerCase() === trimmed.toLowerCase()) ??
      null
    );
  }

  function applyRecipientFromProfiles(customer: BeanCustomerRow, profiles: ThaiPostalAddressValue[]) {
    const merged = mergeCustomerAddressProfiles(
      profiles,
      profilesMatchingName(formSuggestions.recipientProfiles, customer.name),
    );

    if (merged.length === 0) {
      setRecipient((prev) => ({
        ...prev,
        phone: customer.phone ?? prev.phone,
      }));
      return;
    }

    if (merged.length === 1) {
      setRecipient({
        ...merged[0]!,
        name: '',
      });
      return;
    }

    setCustomerAddressPicker(
      merged.map((profile) => ({
        ...profile,
        name: customer.name,
      })),
    );
  }

  async function handleSelectCustomer(customer: BeanCustomerRow) {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name);
    setCustomerResults([]);
    setCustomerAddressPicker(null);

    const addr = await fetchBeanCustomerAddresses(customer.id);
    const savedProfiles =
      addr.success && addr.data?.length
        ? addr.data.map((row) => ({
            ...recipientFromSavedAddress(row),
            name: customer.name,
          }))
        : [];

    applyRecipientFromProfiles(customer, savedProfiles);
  }

  async function handleCustomerNameSelect(name: string) {
    setCustomerQuery(name);
    const customer = await resolveCustomerByName(name);
    if (customer) {
      await handleSelectCustomer(customer);
      return;
    }

    const profileMatches = profilesMatchingName(formSuggestions.recipientProfiles, name);
    if (profileMatches.length === 1) {
      setRecipient({ ...profileMatches[0]!, name: '' });
      return;
    }
    if (profileMatches.length > 1) {
      setCustomerAddressPicker(profileMatches.map((profile) => ({ ...profile, name })));
    }
  }

  async function handleCreateCustomer() {
    if (!customerQuery.trim()) return;

    const formattedAddress = formatThaiPostalAddressLine({
      addressLine: recipient.addressLine,
      subdistrict: recipient.subdistrict,
      district: recipient.district,
      province: recipient.province,
      postalCode: recipient.postalCode,
    });

    const result = await createBeanCustomer({
      name: customerQuery.trim(),
      phone: recipient.phone || undefined,
      address: formattedAddress.trim()
        ? {
            recipientName: recipient.name.trim() || customerQuery.trim(),
            recipientPhone: recipient.phone || undefined,
            recipientAddress: formattedAddress,
            recipientProvince: recipient.province || undefined,
            recipientPostalCode: recipient.postalCode || undefined,
          }
        : undefined,
    });

    if (result.success && result.data) {
      setSelectedCustomer(result.data);
      setCustomerResults([]);
      setRecipient((prev) => ({
        ...prev,
        phone: result.data!.phone ?? prev.phone,
      }));
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
    setRecipient({ ...value, name: '' });
    if (value.name && value.name !== customerQuery) {
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
      name: '',
      phone: pasteData.phone,
    });
    closePasteDialog();
  }

  function handleClearCustomer() {
    if (isReadOnly) {
      setError(READ_ONLY_DENY_MSG);
      return;
    }
    setCustomerQuery('');
    setCustomerResults([]);
    setSelectedCustomer(null);
    setCustomerAddressPicker(null);
    setRecipient(emptyThaiPostalAddress());
    closePasteDialog();
    setClearConfirmOpen(false);
  }

  function openClearCustomerConfirm() {
    if (isReadOnly) {
      setError(READ_ONLY_DENY_MSG);
      return;
    }
    setClearConfirmOpen(true);
  }

  function closeClearCustomerConfirm() {
    setClearConfirmOpen(false);
  }

  function shouldPersistShipment(): boolean {
    if (trackingNumber.trim()) return true;
    return isEdit && Boolean(initialOrder?.shipment);
  }

  function handleRequestRevertPayment() {
    if (isReadOnly) {
      setError(READ_ONLY_DENY_MSG);
      return;
    }
    if (!confirm('เปลี่ยนสถานะเป็นรอชำระ?')) return;
    setRevertPaymentOnSave(true);
    setConfirmPaymentOnSave(false);
  }

  function handleSelectSlipFile(file: File | null) {
    setPendingSlipFile(file);
    setRevertPaymentOnSave(false);
  }

  async function persistPayment(
    targetOrderId: string,
  ): Promise<{ error?: string }> {
    if (revertPaymentOnSave) {
      const result = await revertBeanOrderPayment(targetOrderId, locale);
      if (!result.success) {
        return { error: result.error ?? 'เปลี่ยนสถานะไม่สำเร็จ' };
      }
      return {};
    }

    if (pendingSlipFile) {
      const fd = new FormData();
      fd.set('slip', pendingSlipFile);
      const uploadResult = await uploadBeanOrderSlip(targetOrderId, fd, locale);
      if (!uploadResult.success) {
        return { error: uploadResult.error ?? 'อัปโหลดสลิปไม่สำเร็จ' };
      }
    }

    if (confirmPaymentOnSave) {
      const hasSlip = Boolean(pendingSlipFile || initialOrder?.payment?.uploadedAt);
      if (!hasSlip) {
        return { error: 'กรุณาอัปโหลดสลิปก่อนยืนยันชำระเงิน' };
      }
      const result = await confirmBeanOrderPayment(targetOrderId, locale);
      if (!result.success) {
        return { error: result.error ?? 'ยืนยันชำระไม่สำเร็จ' };
      }
    }

    return {};
  }

  function shouldPersistPayment(): boolean {
    return Boolean(pendingSlipFile || confirmPaymentOnSave || revertPaymentOnSave);
  }

  async function persistShipment(
    targetOrderId: string,
  ): Promise<{ error?: string; warning?: string }> {
    if (!shouldPersistShipment()) return {};

    const resolvedCarrierCode = resolveCarrierCodeForSave(carrierCode, customCarrierLabel);
    if (carrierCode === OTHER_CARRIER_CODE && !customCarrierLabel.trim()) {
      return { error: 'กรุณาระบุช่องทางจัดส่ง' };
    }

    const shipResult = await shipBeanOrder(
      targetOrderId,
      {
        carrierCode: resolvedCarrierCode ?? undefined,
        trackingNumber,
      },
      locale,
    );
    if (!shipResult.success) {
      return { error: shipResult.error ?? 'บันทึกการจัดส่งไม่สำเร็จ' };
    }
    return { warning: shipResult.trackingWarning };
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

    const parsedLines = normalizeBeanOrderLinesForSave(
      lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        weightValue: l.weightValue ? Number(l.weightValue) : 0,
        weightUnit: l.weightUnit,
        unitPricePerKg: l.unitPricePerKg ? Number(l.unitPricePerKg) : 0,
      })),
    );

    if (parsedLines.length === 0) {
      setSaving(false);
      setError('เลือกสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    const payload = {
      customerId: selectedCustomer?.id ?? initialOrder?.customerId ?? null,
      senderName: initialOrder?.senderName || DEFAULT_SHOP_SENDER.name,
      senderPhone: initialOrder?.senderPhone ?? '',
      senderAddress: initialOrder?.senderAddress ?? '',
      recipientName: resolveBeanOrderRecipientName(recipient.name, customerQuery),
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
    };

    const result = isEdit && orderId
      ? await updateBeanOrder(orderId, payload, locale)
      : await createBeanOrder(payload, locale);

    if (!result.success) {
      setSaving(false);
      setError(result.error ?? (isEdit ? 'แก้ไขออเดอร์ไม่สำเร็จ' : 'สร้างออเดอร์ไม่สำเร็จ'));
      return;
    }

    const rawTargetOrderId =
      isEdit && orderId
        ? orderId
        : 'orderId' in result
          ? result.orderId
          : undefined;
    const targetOrderId =
      typeof rawTargetOrderId === 'string' ? rawTargetOrderId : undefined;
    if (targetOrderId) {
      if (shouldPersistPayment()) {
        const paymentResult = await persistPayment(targetOrderId);
        if (paymentResult.error) {
          setSaving(false);
          setError(`${paymentResult.error} — ออเดอร์ถูกบันทึกแล้ว`);
          router.push(`/${locale}/bean-orders/${targetOrderId}`);
          return;
        }
      }

      if (shouldPersistShipment()) {
        const shipmentResult = await persistShipment(targetOrderId);
        if (shipmentResult.error) {
          setSaving(false);
          setError(`${shipmentResult.error} — ออเดอร์ถูกบันทึกแล้ว`);
          router.push(`/${locale}/bean-orders/${targetOrderId}`);
          return;
        }
      }
    }

    setSaving(false);
    if (isEdit && orderId) {
      router.push(`/${locale}/bean-orders/${orderId}`);
      return;
    }
    if ('orderId' in result && result.orderId) {
      router.push(`/${locale}/bean-orders/${result.orderId}`);
    }
  }

  const inputClass = BEAN_ORDER_INPUT;

  return (
    <form onSubmit={handleSubmit} className={BEAN_ORDER_FORM_PAGE}>
      <Link
        href={isEdit && orderId ? `/${locale}/bean-orders/${orderId}` : `/${locale}/bean-orders`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {isEdit ? 'กลับรายละเอียด' : 'กลับรายการ'}
      </Link>
      <h1 className="text-2xl font-normal mb-6">
        {isEdit ? `แก้ไขออเดอร์ ${initialOrder?.orderNo ?? ''}` : 'สร้างออเดอร์เมล็ดกาแฟ'}
      </h1>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className={BEAN_ORDER_FORM_SECTION}>
        <h2 className="text-sm font-normal text-muted-foreground">ออเดอร์เมล็ดกาแฟ</h2>
        <div className={BEAN_ORDER_FORM_MAIN_GRID}>
      <section className={cn(BEAN_ORDER_CARD, BEAN_ORDER_FORM_PANEL, 'space-y-3')}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-normal text-muted-foreground">ลูกค้า</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePasteCustomer()}
              disabled={isReadOnly || pasteLoading}
              className={BEAN_ORDER_BTN_SM_OUTLINE}
            >
              <Clipboard className="h-3.5 w-3.5" aria-hidden />
              วางข้อมูลลูกค้า
            </button>
            <button
              type="button"
              onClick={openClearCustomerConfirm}
              disabled={isReadOnly}
              className={BEAN_ORDER_BTN_SM_DANGER}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              ล้างข้อมูล
            </button>
          </div>
        </div>
        <AutocompleteTextField
          value={customerQuery}
          onChange={(q) => void handleCustomerSearch(q)}
          onSelect={handleCustomerNameSelect}
          suggestions={customerNameSuggestions}
          inputClass={inputClass}
          placeholder="ชื่อลูกค้า (ไม่บังคับที่อยู่)"
        />
        {!selectedCustomer && customerQuery.trim() && (
          <button
            type="button"
            onClick={() => void handleCreateCustomer()}
            disabled={isReadOnly}
            className={BEAN_ORDER_BTN_PASTEL_FULL}
          >
            <Plus className="h-4 w-4" aria-hidden />
            สร้างลูกค้าใหม่ &quot;{customerQuery.trim()}&quot;
          </button>
        )}
        {customerAddressPicker && (
          <AddressProfilePickerDialog
            open
            title="เลือกที่อยู่ของลูกค้า"
            profiles={customerAddressPicker}
            onSelect={(profile) => {
              handleRecipientChange(profile);
              setCustomerQuery(profile.name);
              setCustomerAddressPicker(null);
            }}
            onCancel={() => setCustomerAddressPicker(null)}
          />
        )}

        <ThaiPostalAddressSection
          title=""
          embedded
          hideNameField
          value={recipient}
          onChange={handleRecipientChange}
          profiles={formSuggestions.recipientProfiles}
          inputClass={inputClass}
        />
      </section>

      <section className={cn(BEAN_ORDER_CARD, BEAN_ORDER_FORM_PANEL)}>
        <h2 className="mb-3 text-xs text-muted-foreground">รายการสินค้า</h2>
        <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-3">
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
              className={BEAN_ORDER_FORM_LINE_GRID}
            >
              <BeanOrderSelect
                value={line.inventoryItemId}
                onChange={(e) =>
                  setLines((prev) => prev.map((l, i) => (i === index ? { ...l, inventoryItemId: e.target.value } : l)))
                }
              >
                <option value="">เลือกสินค้า</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </BeanOrderSelect>
              <div className="flex min-w-0 gap-2">
                <AutocompleteTextField
                  value={line.weightValue}
                  onChange={(weightValue) =>
                    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, weightValue: sanitizeNum(weightValue) } : l)))
                  }
                  suggestions={filterStringSuggestions(weightSuggestions, line.weightValue)}
                  inputClass={cn(inputClass, 'min-w-0 flex-1')}
                  placeholder="น้ำหนัก"
                  inputMode="decimal"
                />
                <BeanOrderSelect
                  className="w-[4.25rem] shrink-0 px-2 pr-8 text-center"
                  value={line.weightUnit}
                  onChange={(e) =>
                    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, weightUnit: e.target.value as WeightUnit } : l)))
                  }
                >
                  <option value="g">ก.</option>
                  <option value="kg">กก.</option>
                </BeanOrderSelect>
              </div>
              <AutocompleteTextField
                value={line.unitPricePerKg}
                onChange={(unitPricePerKg) =>
                  setLines((prev) => prev.map((l, i) => (i === index ? { ...l, unitPricePerKg: sanitizeNum(unitPricePerKg) } : l)))
                }
                suggestions={filterStringSuggestions(priceSuggestions, line.unitPricePerKg)}
                inputClass={cn(inputClass, 'min-w-0')}
                placeholder="ราคา/หน่วย"
                inputMode="decimal"
              />
              {linePresetOptions.length > 0 && (
                <div className="sm:col-span-4">
                  <p className="mb-1.5 text-xs text-muted-foreground">รายการเดิมที่เคยสั่ง</p>
                  <ul className="divide-y rounded-xl border border-border">
                    {linePresetOptions.slice(0, 6).map((preset) => (
                      <li key={`${preset.inventoryItemId}-${preset.weightValue}-${preset.unitPricePerKg}`}>
                        <button
                          type="button"
                          className={BEAN_ORDER_BTN_LIST}
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
                  className={BEAN_ORDER_BTN_DANGER_GHOST}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  <span className="sm:sr-only">ลบ</span>
                </button>
              )}
            </div>
          );
        })}
        </div>
        <div className="mt-3 flex shrink-0 justify-end">
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
            className={BEAN_ORDER_BTN_SM_OUTLINE}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            เพิ่มรายการ
          </button>
        </div>
        </div>
      </section>

      <section className={cn(BEAN_ORDER_CARD, BEAN_ORDER_FORM_PANEL, 'space-y-3')}>
        <h2 className="text-xs text-muted-foreground">สรุปยอด</h2>
        <div className="flex min-h-0 flex-1 flex-col space-y-3">
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
          <AutocompleteTextField
            value={notes}
            onChange={setNotes}
            suggestions={filterStringSuggestions(formSuggestions.notes, notes)}
            inputClass={inputClass}
            placeholder="หมายเหตุ"
            multiline
          />
          <div className="mt-auto space-y-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm">
            <p className="text-muted-foreground">
              รวมสินค้า{' '}
              <span className="tabular-nums text-foreground">{totals.subtotalBaht.toLocaleString('th-TH')} ฿</span>
            </p>
            <p className="text-base text-foreground">
              ยอดรวม <span className="tabular-nums">{totals.totalBaht.toLocaleString('th-TH')} ฿</span>
            </p>
          </div>
        </div>
      </section>
        </div>
      </div>

      <div className={BEAN_ORDER_FORM_FULFILLMENT_GRID}>
        <div className={BEAN_ORDER_FORM_FULFILLMENT_COLUMN}>
          <h2 className="text-sm font-normal text-muted-foreground">ข้อมูลการชำระเงิน</h2>
          <section className={cn(BEAN_ORDER_CARD, BEAN_ORDER_FORM_FULFILLMENT_CARD)}>
            <BeanOrderPaymentFields
              orderId={orderId}
              slipUrl={initialOrder?.payment?.slipUrl ?? null}
              uploadedAt={initialOrder?.payment?.uploadedAt ?? null}
              confirmedAt={initialOrder?.payment?.confirmedAt ?? null}
              confirmedBy={initialOrder?.payment?.confirmedBy ?? null}
              paymentStatus={paymentStatus}
              pendingSlipFile={pendingSlipFile}
              pendingSlipPreview={pendingSlipPreview}
              onSelectSlipFile={handleSelectSlipFile}
              confirmPaymentOnSave={confirmPaymentOnSave}
              onConfirmPaymentOnSaveChange={setConfirmPaymentOnSave}
              onRequestRevertPayment={handleRequestRevertPayment}
              disabled={isReadOnly || saving}
            />
          </section>
        </div>

        <div className={BEAN_ORDER_FORM_FULFILLMENT_COLUMN}>
          <h2 className="text-sm font-normal text-muted-foreground">ข้อมูลการจัดส่ง</h2>
          <section className={cn(BEAN_ORDER_CARD, BEAN_ORDER_FORM_FULFILLMENT_CARD)}>
            <div className={BEAN_ORDER_FORM_FULFILLMENT_CARD_BODY}>
              <BeanOrderShippingFields
                carrierCode={carrierCode}
                customCarrierLabel={customCarrierLabel}
                trackingNumber={trackingNumber}
                onCarrierCodeChange={setCarrierCode}
                onCustomCarrierLabelChange={setCustomCarrierLabel}
                onTrackingNumberChange={setTrackingNumber}
                inputClass={inputClass}
                disabled={isReadOnly || saving}
              />
            </div>
          </section>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || isReadOnly}
        className={BEAN_ORDER_BTN_PRIMARY_FULL}
      >
        {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'บันทึกออเดอร์'}
      </button>

      <PasteCustomerDialog
        open={pasteOpen}
        loading={pasteLoading}
        error={pasteError}
        data={pasteData}
        onConfirm={applyPastedCustomer}
        onCancel={closePasteDialog}
      />
      <ClearCustomerConfirmDialog
        open={clearConfirmOpen}
        onConfirm={handleClearCustomer}
        onCancel={closeClearCustomerConfirm}
      />
    </form>
  );
}
