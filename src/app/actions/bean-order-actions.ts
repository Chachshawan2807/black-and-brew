'use server';

import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { recordDataChange } from '@/app/actions/data-change-log-actions';
import { DEFAULT_SHOP_SENDER } from '@/lib/bean-orders/defaults';
import { formatBeanOrderNo } from '@/lib/bean-orders/order-number';
import {
  appendStatusHistory,
  canCancelOrder,
  canConfirmPayment,
  canEditOrderLines,
  canShip,
  canUploadSlip,
} from '@/lib/bean-orders/order-status';
import { computeLineTotal, computeOrderTotals } from '@/lib/bean-orders/pricing';
import { filterBeanOrderInventoryItems, BEAN_ORDER_INVENTORY_ITEM_NAMES } from '@/lib/bean-orders/inventory-items';
import { createTrackingMoreShipment, fetchTrackingMoreStatus } from '@/lib/bean-orders/trackingmore';
import {
  parseThaiPostalAddressLine,
  type ThaiPostalAddressValue,
} from '@/lib/bean-orders/address';
import {
  mergeFormSuggestions,
  type BeanOrderFormSuggestions,
  type BeanOrderLinePreset,
} from '@/lib/bean-orders/form-suggestions';
import type { DeliveryType, StatusHistoryEntry, WeightUnit } from '@/lib/bean-orders/types';
import { resolveActorLabel } from '@/lib/data-change-log';
import { gateMutation, requireReadAccess } from '@/lib/policies/server-gate';
import { ensureServerSession } from '@/lib/security/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const weightUnitSchema = z.enum(['g', 'kg']);
const deliveryTypeSchema = z.enum(['parcel', 'same_day']);

const lineInputSchema = z.object({
  inventoryItemId: z.string().uuid(),
  weightValue: z.number().positive(),
  weightUnit: weightUnitSchema,
  unitPricePerKg: z.number().min(0),
});

const createOrderSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  senderName: z.string().min(1),
  senderPhone: z.string().optional(),
  senderAddress: z.string().optional(),
  recipientName: z.string().min(1),
  recipientPhone: z.string().optional(),
  recipientAddress: z.string().min(1),
  recipientProvince: z.string().optional(),
  recipientPostalCode: z.string().optional(),
  discountBaht: z.number().min(0).default(0),
  shippingBaht: z.number().min(0).default(0),
  notes: z.string().optional(),
  lines: z.array(lineInputSchema).min(1),
});

const shipOrderSchema = z.object({
  deliveryType: deliveryTypeSchema,
  carrierCode: z.string().optional(),
  trackingNumber: z.string().optional(),
});

export type BeanOrderListRow = {
  id: string;
  orderNo: string;
  customerName: string | null;
  recipientName: string;
  totalBaht: number;
  paymentStatus: 'unpaid' | 'paid';
  fulfillmentStatus: 'pending' | 'shipped';
  trackingNumber: string | null;
  trackingStatus: string | null;
  cancelledAt: string | null;
  createdAt: string;
};

export type BeanOrderLineRow = {
  id: string;
  inventoryItemId: string | null;
  itemName: string;
  weightValue: number;
  weightUnit: WeightUnit;
  unitPricePerKg: number;
  lineTotalBaht: number;
};

export type BeanOrderDetail = BeanOrderListRow & {
  customerId: string | null;
  senderName: string | null;
  senderPhone: string | null;
  senderAddress: string | null;
  recipientPhone: string | null;
  recipientAddress: string;
  recipientProvince: string | null;
  recipientPostalCode: string | null;
  subtotalBaht: number;
  discountBaht: number;
  shippingBaht: number;
  notes: string | null;
  statusHistory: StatusHistoryEntry[];
  lines: BeanOrderLineRow[];
  payment: {
    slipUrl: string | null;
    uploadedAt: string | null;
    confirmedAt: string | null;
    confirmedBy: string | null;
  } | null;
  shipment: {
    deliveryType: DeliveryType;
    carrierCode: string | null;
    trackingNumber: string | null;
    trackingStatus: string | null;
    shippedAt: string;
  } | null;
};

export type BeanCustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
};

export type BeanCustomerAddressRow = {
  id: string;
  label: string | null;
  recipientName: string;
  recipientPhone: string | null;
  addressLine: string;
  province: string | null;
  postalCode: string | null;
};

async function resolveActorLabelFromSession(): Promise<string> {
  await ensureServerSession();
  const cookieStore = await cookies();
  const readOnly = cookieStore.get('bb_auth_read_only')?.value === 'true';
  const accessLevel = readOnly ? 'read_only' : 'full';
  const headerStore = await headers();
  const userAgent = headerStore.get('user-agent');
  return resolveActorLabel(accessLevel, undefined, userAgent);
}

async function nextOrderNo(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const { count, error } = await supabase
    .from('bean_orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  if (error) {
    console.error('Supabase Error (nextOrderNo):', error.message, error.details);
    throw error;
  }

  return formatBeanOrderNo(now, (count ?? 0) + 1);
}

async function loadInventoryNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('inventory_items').select('id, name').in('id', ids);
  if (error) {
    console.error('Supabase Error (loadInventoryNames):', error.message, error.details);
    throw error;
  }
  return new Map((data ?? []).map((row) => [row.id as string, row.name as string]));
}

function revalidateBeanOrders(locale = 'th') {
  revalidatePath(`/${locale}/bean-orders`);
}

export async function searchBeanCustomers(query: string): Promise<{
  success: boolean;
  data?: BeanCustomerRow[];
  error?: string;
}> {
  const readError = await requireReadAccess();
  if (readError) return { success: false, error: readError };

  const q = query.trim();
  if (!q) return { success: true, data: [] };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('bean_customers')
      .select('id, name, phone, notes')
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .order('name')
      .limit(20);

    if (error) {
      console.error('Supabase Error (searchBeanCustomers):', error.message, error.details);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        phone: (row.phone as string | null) ?? null,
        notes: (row.notes as string | null) ?? null,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ค้นหาลูกค้าไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function createBeanCustomer(input: {
  name: string;
  phone?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: BeanCustomerRow; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  const parsed = z
    .object({ name: z.string().min(1), phone: z.string().optional(), notes: z.string().optional() })
    .safeParse(input);
  if (!parsed.success) return { success: false, error: 'ข้อมูลลูกค้าไม่ถูกต้อง' };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('bean_customers')
      .insert({
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select('id, name, phone, notes')
      .single();

    if (error) {
      console.error('Supabase Error (createBeanCustomer):', error.message, error.details);
      return { success: false, error: error.message };
    }

    const row: BeanCustomerRow = {
      id: data.id as string,
      name: data.name as string,
      phone: (data.phone as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
    };

    void recordDataChange({
      action: 'CREATE',
      module: 'bean_orders',
      entityType: 'bean_customer',
      entityId: row.id,
      entityLabel: row.name,
      newValue: row,
    });

    return { success: true, data: row };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'สร้างลูกค้าไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function fetchBeanCustomerAddresses(
  customerId: string,
): Promise<{ success: boolean; data?: BeanCustomerAddressRow[]; error?: string }> {
  const readError = await requireReadAccess();
  if (readError) return { success: false, error: readError };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('bean_customer_addresses')
      .select('id, label, recipient_name, recipient_phone, address_line, province, postal_code')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Error (fetchBeanCustomerAddresses):', error.message, error.details);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) => ({
        id: row.id as string,
        label: (row.label as string | null) ?? null,
        recipientName: row.recipient_name as string,
        recipientPhone: (row.recipient_phone as string | null) ?? null,
        addressLine: row.address_line as string,
        province: (row.province as string | null) ?? null,
        postalCode: (row.postal_code as string | null) ?? null,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'โหลดที่อยู่ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function fetchBeanOrders(filters?: {
  paymentStatus?: 'unpaid' | 'paid';
  fulfillmentStatus?: 'pending' | 'shipped';
  search?: string;
}): Promise<{ success: boolean; data?: BeanOrderListRow[]; error?: string }> {
  const readError = await requireReadAccess();
  if (readError) return { success: false, error: readError };

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from('bean_orders')
      .select(
        'id, order_no, recipient_name, total_baht, payment_status, fulfillment_status, cancelled_at, created_at, customer_id, bean_customers(name), bean_order_shipments(tracking_number, tracking_status)',
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (filters?.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
    if (filters?.fulfillmentStatus) query = query.eq('fulfillment_status', filters.fulfillmentStatus);
    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      query = query.or(`order_no.ilike.%${q}%,recipient_name.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase Error (fetchBeanOrders):', error.message, error.details);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: (data ?? []).map((row) => {
        const customer = row.bean_customers as { name?: string } | null;
        const shipmentRaw = row.bean_order_shipments as
          | { tracking_number?: string | null; tracking_status?: string | null }
          | { tracking_number?: string | null; tracking_status?: string | null }[]
          | null;
        const shipment = Array.isArray(shipmentRaw) ? shipmentRaw[0] : shipmentRaw;
        return {
          id: row.id as string,
          orderNo: row.order_no as string,
          customerName: customer?.name ?? null,
          recipientName: row.recipient_name as string,
          totalBaht: Number(row.total_baht) || 0,
          paymentStatus: row.payment_status as 'unpaid' | 'paid',
          fulfillmentStatus: row.fulfillment_status as 'pending' | 'shipped',
          trackingNumber: (shipment?.tracking_number as string | null) ?? null,
          trackingStatus: (shipment?.tracking_status as string | null) ?? null,
          cancelledAt: (row.cancelled_at as string | null) ?? null,
          createdAt: row.created_at as string,
        };
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'โหลดรายการออเดอร์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function fetchBeanOrderDetail(
  orderId: string,
): Promise<{ success: boolean; data?: BeanOrderDetail; error?: string }> {
  const readError = await requireReadAccess();
  if (readError) return { success: false, error: readError };

  try {
    const supabase = getSupabaseAdmin();
    const [orderResult, linesResult, paymentResult, shipmentResult] = await Promise.all([
      supabase
        .from('bean_orders')
        .select('*, bean_customers(name)')
        .eq('id', orderId)
        .maybeSingle(),
      supabase
        .from('bean_order_lines')
        .select('id, inventory_item_id, item_name, weight_value, weight_unit, unit_price_per_kg, line_total_baht')
        .eq('order_id', orderId)
        .order('sort_order'),
      supabase
        .from('bean_order_payments')
        .select('slip_url, uploaded_at, confirmed_at, confirmed_by')
        .eq('order_id', orderId)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('bean_order_shipments')
        .select('delivery_type, carrier_code, tracking_number, tracking_status, shipped_at')
        .eq('order_id', orderId)
        .maybeSingle(),
    ]);

    if (orderResult.error) {
      console.error('Supabase Error (fetchBeanOrderDetail):', orderResult.error.message, orderResult.error.details);
      return { success: false, error: orderResult.error.message };
    }
    if (!orderResult.data) return { success: false, error: 'ไม่พบออเดอร์' };

    const order = orderResult.data;
    const customer = order.bean_customers as { name?: string } | null;

    let slipUrl: string | null = null;
    if (paymentResult.data?.slip_url) {
      const { data: signed } = await supabase.storage
        .from('bean-order-slips')
        .createSignedUrl(paymentResult.data.slip_url as string, 3600);
      slipUrl = signed?.signedUrl ?? null;
    }

    return {
      success: true,
      data: {
        id: order.id as string,
        orderNo: order.order_no as string,
        customerId: (order.customer_id as string | null) ?? null,
        customerName: customer?.name ?? null,
        senderName: (order.sender_name as string | null) ?? null,
        senderPhone: (order.sender_phone as string | null) ?? null,
        senderAddress: (order.sender_address as string | null) ?? null,
        recipientName: order.recipient_name as string,
        recipientPhone: (order.recipient_phone as string | null) ?? null,
        recipientAddress: order.recipient_address as string,
        recipientProvince: (order.recipient_province as string | null) ?? null,
        recipientPostalCode: (order.recipient_postal_code as string | null) ?? null,
        subtotalBaht: Number(order.subtotal_baht) || 0,
        discountBaht: Number(order.discount_baht) || 0,
        shippingBaht: Number(order.shipping_baht) || 0,
        totalBaht: Number(order.total_baht) || 0,
        paymentStatus: order.payment_status as 'unpaid' | 'paid',
        fulfillmentStatus: order.fulfillment_status as 'pending' | 'shipped',
        cancelledAt: (order.cancelled_at as string | null) ?? null,
        notes: (order.notes as string | null) ?? null,
        statusHistory: (order.status_history as StatusHistoryEntry[]) ?? [],
        createdAt: order.created_at as string,
        lines: (linesResult.data ?? []).map((line) => ({
          id: line.id as string,
          inventoryItemId: (line.inventory_item_id as string | null) ?? null,
          itemName: line.item_name as string,
          weightValue: Number(line.weight_value) || 0,
          weightUnit: line.weight_unit as WeightUnit,
          unitPricePerKg: Number(line.unit_price_per_kg) || 0,
          lineTotalBaht: Number(line.line_total_baht) || 0,
        })),
        payment: paymentResult.data
          ? {
              slipUrl,
              uploadedAt: (paymentResult.data.uploaded_at as string | null) ?? null,
              confirmedAt: (paymentResult.data.confirmed_at as string | null) ?? null,
              confirmedBy: (paymentResult.data.confirmed_by as string | null) ?? null,
            }
          : null,
        shipment: shipmentResult.data
          ? {
              deliveryType: shipmentResult.data.delivery_type as DeliveryType,
              carrierCode: (shipmentResult.data.carrier_code as string | null) ?? null,
              trackingNumber: (shipmentResult.data.tracking_number as string | null) ?? null,
              trackingStatus: (shipmentResult.data.tracking_status as string | null) ?? null,
              shippedAt: shipmentResult.data.shipped_at as string,
            }
          : null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'โหลดรายละเอียดออเดอร์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function createBeanOrder(
  input: z.infer<typeof createOrderSchema>,
  locale = 'th',
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'ข้อมูลออเดอร์ไม่ถูกต้อง' };

  try {
    const namesById = await loadInventoryNames(parsed.data.lines.map((l) => l.inventoryItemId));
    for (const line of parsed.data.lines) {
      if (!namesById.has(line.inventoryItemId)) {
        return { success: false, error: `ไม่พบสินค้าในคลัง (ID: ${line.inventoryItemId})` };
      }
    }

    const totals = computeOrderTotals(
      parsed.data.lines.map((l) => ({
        inventoryItemId: l.inventoryItemId,
        weightValue: l.weightValue,
        weightUnit: l.weightUnit,
        unitPricePerKg: l.unitPricePerKg,
      })),
      parsed.data.discountBaht,
      parsed.data.shippingBaht,
    );

    const actor = await resolveActorLabelFromSession();
    const history = appendStatusHistory([], {
      by: actor,
      action: 'created',
      payment_status: 'unpaid',
      fulfillment_status: 'pending',
    });

    const supabase = getSupabaseAdmin();
    const orderNo = await nextOrderNo();

    const { data: order, error: orderError } = await supabase
      .from('bean_orders')
      .insert({
        order_no: orderNo,
        customer_id: parsed.data.customerId ?? null,
        sender_name: parsed.data.senderName || DEFAULT_SHOP_SENDER.name,
        sender_phone: parsed.data.senderPhone ?? null,
        sender_address: parsed.data.senderAddress ?? null,
        recipient_name: parsed.data.recipientName,
        recipient_phone: parsed.data.recipientPhone ?? null,
        recipient_address: parsed.data.recipientAddress,
        recipient_province: parsed.data.recipientProvince ?? null,
        recipient_postal_code: parsed.data.recipientPostalCode ?? null,
        subtotal_baht: totals.subtotalBaht,
        discount_baht: totals.discountBaht,
        shipping_baht: totals.shippingBaht,
        total_baht: totals.totalBaht,
        payment_status: 'unpaid',
        fulfillment_status: 'pending',
        status_history: history,
        notes: parsed.data.notes ?? null,
        created_by: actor,
      })
      .select('id, order_no')
      .single();

    if (orderError) {
      console.error('Supabase Error (createBeanOrder):', orderError.message, orderError.details);
      return { success: false, error: orderError.message };
    }

    const lineRows = parsed.data.lines.map((line, index) => ({
      order_id: order.id,
      inventory_item_id: line.inventoryItemId,
      item_name: namesById.get(line.inventoryItemId) ?? '—',
      weight_value: line.weightValue,
      weight_unit: line.weightUnit,
      unit_price_per_kg: line.unitPricePerKg,
      line_total_baht: computeLineTotal(line.weightValue, line.weightUnit, line.unitPricePerKg),
      sort_order: index,
    }));

    const { error: linesError } = await supabase.from('bean_order_lines').insert(lineRows);
    if (linesError) {
      console.error('Supabase Error (createBeanOrder lines):', linesError.message, linesError.details);
      return { success: false, error: linesError.message };
    }

    void recordDataChange({
      action: 'CREATE',
      module: 'bean_orders',
      entityType: 'bean_order',
      entityId: order.id as string,
      entityLabel: order.order_no as string,
      newValue: { orderNo, totalBaht: totals.totalBaht },
    });

    revalidateBeanOrders(locale);
    return { success: true, orderId: order.id as string };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'สร้างออเดอร์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function cancelBeanOrder(
  orderId: string,
  locale = 'th',
): Promise<{ success: boolean; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error: fetchError } = await supabase
      .from('bean_orders')
      .select('id, order_no, fulfillment_status, cancelled_at, status_history')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError || !order) {
      return { success: false, error: 'ไม่พบออเดอร์' };
    }
    if (!canCancelOrder(order.fulfillment_status as 'pending' | 'shipped', order.cancelled_at as string | null)) {
      return { success: false, error: 'ยกเลิกออเดอร์นี้ไม่ได้' };
    }

    const actor = await resolveActorLabelFromSession();
    const history = appendStatusHistory((order.status_history as StatusHistoryEntry[]) ?? [], {
      by: actor,
      action: 'cancelled',
      payment_status: 'unpaid',
      fulfillment_status: order.fulfillment_status as 'pending' | 'shipped',
    });

    const { error } = await supabase
      .from('bean_orders')
      .update({
        cancelled_at: new Date().toISOString(),
        cancelled_by: actor,
        status_history: history,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('Supabase Error (cancelBeanOrder):', error.message, error.details);
      return { success: false, error: error.message };
    }

    void recordDataChange({
      action: 'UPDATE',
      module: 'bean_orders',
      entityType: 'bean_order',
      entityId: orderId,
      entityLabel: order.order_no as string,
      fieldChanges: [{ field: 'cancelled_at', old_value: null, new_value: new Date().toISOString() }],
    });

    revalidateBeanOrders(locale);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ยกเลิกออเดอร์ไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function uploadBeanOrderSlip(
  orderId: string,
  formData: FormData,
  locale = 'th',
): Promise<{ success: boolean; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  const file = formData.get('slip');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'กรุณาเลือกไฟล์สลิป' };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error: fetchError } = await supabase
      .from('bean_orders')
      .select('id, order_no, payment_status, cancelled_at')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError || !order) return { success: false, error: 'ไม่พบออเดอร์' };
    if (!canUploadSlip(order.payment_status as 'unpaid' | 'paid', order.cancelled_at as string | null)) {
      return { success: false, error: 'อัปโหลดสลิปไม่ได้ในสถานะนี้' };
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${orderId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('bean-order-slips')
      .upload(path, buffer, { contentType: file.type || 'image/jpeg', upsert: true });

    if (uploadError) {
      console.error('Supabase Error (uploadBeanOrderSlip):', uploadError.message);
      return { success: false, error: uploadError.message };
    }

    const actor = await resolveActorLabelFromSession();
    await supabase.from('bean_order_payments').delete().eq('order_id', orderId);
    const { error: payError } = await supabase.from('bean_order_payments').insert({
      order_id: orderId,
      slip_url: path,
      uploaded_by: actor,
    });

    if (payError) {
      console.error('Supabase Error (uploadBeanOrderSlip payment):', payError.message, payError.details);
      return { success: false, error: payError.message };
    }

    void recordDataChange({
      action: 'UPDATE',
      module: 'bean_orders',
      entityType: 'bean_order_payment',
      entityId: orderId,
      entityLabel: order.order_no as string,
      metadata: { action: 'slip_uploaded' },
    });

    revalidateBeanOrders(locale);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'อัปโหลดสลิปไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function confirmBeanOrderPayment(
  orderId: string,
  locale = 'th',
): Promise<{ success: boolean; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error: fetchError } = await supabase
      .from('bean_orders')
      .select('id, order_no, payment_status, fulfillment_status, cancelled_at, status_history')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError || !order) return { success: false, error: 'ไม่พบออเดอร์' };
    if (!canConfirmPayment(order.payment_status as 'unpaid' | 'paid', order.cancelled_at as string | null)) {
      return { success: false, error: 'ยืนยันชำระไม่ได้ในสถานะนี้' };
    }

    const actor = await resolveActorLabelFromSession();
    const history = appendStatusHistory((order.status_history as StatusHistoryEntry[]) ?? [], {
      by: actor,
      action: 'payment_confirmed',
      payment_status: 'paid',
      fulfillment_status: order.fulfillment_status as 'pending' | 'shipped',
    });

    const now = new Date().toISOString();
    const [{ error: orderError }, { error: payError }] = await Promise.all([
      supabase
        .from('bean_orders')
        .update({
          payment_status: 'paid',
          status_history: history,
          updated_at: now,
        })
        .eq('id', orderId),
      supabase
        .from('bean_order_payments')
        .update({ confirmed_by: actor, confirmed_at: now })
        .eq('order_id', orderId),
    ]);

    if (orderError) {
      console.error('Supabase Error (confirmBeanOrderPayment):', orderError.message, orderError.details);
      return { success: false, error: orderError.message };
    }
    if (payError) {
      console.error('Supabase Error (confirmBeanOrderPayment slip):', payError.message, payError.details);
    }

    void recordDataChange({
      action: 'UPDATE',
      module: 'bean_orders',
      entityType: 'bean_order',
      entityId: orderId,
      entityLabel: order.order_no as string,
      fieldChanges: [{ field: 'payment_status', old_value: 'unpaid', new_value: 'paid' }],
    });

    revalidateBeanOrders(locale);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ยืนยันชำระไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function shipBeanOrder(
  orderId: string,
  input: z.infer<typeof shipOrderSchema>,
  locale = 'th',
): Promise<{ success: boolean; trackingWarning?: string; error?: string }> {
  const gate = await gateMutation();
  if (!gate.success) return gate;

  const parsed = shipOrderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'ข้อมูลจัดส่งไม่ถูกต้อง' };

  const trackingNumber = parsed.data.trackingNumber?.trim() || '';

  try {
    const supabase = getSupabaseAdmin();
    const { data: order, error: fetchError } = await supabase
      .from('bean_orders')
      .select('id, order_no, payment_status, fulfillment_status, cancelled_at, status_history')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError || !order) return { success: false, error: 'ไม่พบออเดอร์' };
    if (!canShip(order.fulfillment_status as 'pending' | 'shipped', order.cancelled_at as string | null)) {
      return { success: false, error: 'จัดส่งออเดอร์นี้ไม่ได้' };
    }

    const actor = await resolveActorLabelFromSession();
    const history = appendStatusHistory((order.status_history as StatusHistoryEntry[]) ?? [], {
      by: actor,
      action: 'shipped',
      payment_status: order.payment_status as 'unpaid' | 'paid',
      fulfillment_status: 'shipped',
    });

    let trackingStatus: string | null = null;
    let trackingRaw: Record<string, unknown> | null = null;
    let trackingWarning: string | undefined;

    if (trackingNumber && parsed.data.carrierCode && parsed.data.carrierCode !== 'other') {
      const tm = await createTrackingMoreShipment({
        trackingNumber,
        carrierCode: parsed.data.carrierCode,
      });
      if (tm.ok) {
        trackingRaw = tm.data;
        const fetched = await fetchTrackingMoreStatus(trackingNumber, parsed.data.carrierCode);
        if (fetched.ok) {
          trackingStatus = fetched.status;
          trackingRaw = fetched.raw;
        } else {
          trackingStatus = 'registered';
        }
      } else {
        trackingWarning = tm.error;
      }
    }

    const [{ error: orderError }, { error: shipError }] = await Promise.all([
      supabase
        .from('bean_orders')
        .update({
          fulfillment_status: 'shipped',
          status_history: history,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId),
      supabase.from('bean_order_shipments').upsert({
        order_id: orderId,
        delivery_type: parsed.data.deliveryType,
        carrier_code: parsed.data.carrierCode ?? null,
        tracking_number: trackingNumber || null,
        tracking_status: trackingStatus,
        tracking_raw: trackingRaw,
        shipped_by: actor,
        shipped_at: new Date().toISOString(),
      }),
    ]);

    if (orderError) {
      console.error('Supabase Error (shipBeanOrder):', orderError.message, orderError.details);
      return { success: false, error: orderError.message };
    }
    if (shipError) {
      console.error('Supabase Error (shipBeanOrder shipment):', shipError.message, shipError.details);
      return { success: false, error: shipError.message };
    }

    void recordDataChange({
      action: 'UPDATE',
      module: 'bean_orders',
      entityType: 'bean_order',
      entityId: orderId,
      entityLabel: order.order_no as string,
      fieldChanges: [{ field: 'fulfillment_status', old_value: 'pending', new_value: 'shipped' }],
      metadata: { trackingNumber: trackingNumber || null },
    });

    revalidateBeanOrders(locale);
    return { success: true, trackingWarning };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'บันทึกจัดส่งไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function fetchInventoryItemsForBeanOrders(): Promise<{
  success: boolean;
  data?: { id: string; name: string }[];
  error?: string;
}> {
  const readError = await requireReadAccess();
  if (readError) return { success: false, error: readError };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name')
      .in('name', [...BEAN_ORDER_INVENTORY_ITEM_NAMES])
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Supabase Error (fetchInventoryItemsForBeanOrders):', error.message, error.details);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: filterBeanOrderInventoryItems(
        (data ?? []).map((row) => ({ id: row.id as string, name: row.name as string })),
      ),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'โหลดสินค้าไม่สำเร็จ';
    return { success: false, error: message };
  }
}

export async function fetchBeanOrderFormSuggestions(): Promise<{
  success: boolean;
  data?: BeanOrderFormSuggestions;
  error?: string;
}> {
  const readError = await requireReadAccess();
  if (readError) return { success: false, error: readError };

  try {
    const supabase = getSupabaseAdmin();
    const [ordersRes, addressesRes, linesRes] = await Promise.all([
      supabase
        .from('bean_orders')
        .select(
          'sender_name, sender_phone, sender_address, recipient_name, recipient_phone, recipient_address, recipient_province, recipient_postal_code, shipping_baht, discount_baht, notes',
        )
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('bean_customer_addresses')
        .select(
          'recipient_name, recipient_phone, address_line, province, postal_code, bean_customers(name, phone)',
        )
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('bean_order_lines')
        .select('inventory_item_id, weight_value, weight_unit, unit_price_per_kg')
        .order('created_at', { ascending: false })
        .limit(400),
    ]);

    if (ordersRes.error) {
      console.error('Supabase Error (fetchBeanOrderFormSuggestions orders):', ordersRes.error.message, ordersRes.error.details);
      return { success: false, error: ordersRes.error.message };
    }
    if (addressesRes.error) {
      console.error('Supabase Error (fetchBeanOrderFormSuggestions addresses):', addressesRes.error.message, addressesRes.error.details);
      return { success: false, error: addressesRes.error.message };
    }
    if (linesRes.error) {
      console.error('Supabase Error (fetchBeanOrderFormSuggestions lines):', linesRes.error.message, linesRes.error.details);
      return { success: false, error: linesRes.error.message };
    }

    const senderProfiles: ThaiPostalAddressValue[] = [];
    const recipientProfiles: ThaiPostalAddressValue[] = [];
    const shippingBahtValues: number[] = [];
    const discountBahtValues: number[] = [];
    const notes: string[] = [];
    const linePresets: BeanOrderLinePreset[] = [];

    for (const order of ordersRes.data ?? []) {
      if (order.sender_name || order.sender_phone || order.sender_address) {
        senderProfiles.push(
          parseThaiPostalAddressLine((order.sender_address as string | null) ?? '', {
            name: (order.sender_name as string | null) ?? '',
            phone: (order.sender_phone as string | null) ?? '',
          }),
        );
      }
      if (order.recipient_name || order.recipient_phone || order.recipient_address) {
        recipientProfiles.push(
          parseThaiPostalAddressLine((order.recipient_address as string | null) ?? '', {
            name: (order.recipient_name as string | null) ?? '',
            phone: (order.recipient_phone as string | null) ?? '',
            province: (order.recipient_province as string | null) ?? undefined,
            postalCode: (order.recipient_postal_code as string | null) ?? undefined,
          }),
        );
      }
      shippingBahtValues.push(Number(order.shipping_baht) || 0);
      discountBahtValues.push(Number(order.discount_baht) || 0);
      if (typeof order.notes === 'string' && order.notes.trim()) notes.push(order.notes);
    }

    for (const row of addressesRes.data ?? []) {
      const customer = row.bean_customers as { name?: string; phone?: string | null } | null;
      recipientProfiles.push(
        parseThaiPostalAddressLine(row.address_line as string, {
          name: (row.recipient_name as string) || customer?.name || '',
          phone: (row.recipient_phone as string | null) ?? customer?.phone ?? '',
          province: (row.province as string | null) ?? undefined,
          postalCode: (row.postal_code as string | null) ?? undefined,
        }),
      );
    }

    for (const line of linesRes.data ?? []) {
      if (!line.inventory_item_id) continue;
      linePresets.push({
        inventoryItemId: line.inventory_item_id as string,
        weightValue: Number(line.weight_value) || 0,
        weightUnit: line.weight_unit as BeanOrderLinePreset['weightUnit'],
        unitPricePerKg: Number(line.unit_price_per_kg) || 0,
      });
    }

    return {
      success: true,
      data: mergeFormSuggestions({
        senderProfiles,
        recipientProfiles,
        linePresets,
        shippingBahtValues,
        discountBahtValues,
        notes,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'โหลดข้อมูลแนะนำไม่สำเร็จ';
    return { success: false, error: message };
  }
}
