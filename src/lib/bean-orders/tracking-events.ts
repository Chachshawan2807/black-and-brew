import { formatShipmentTrackingLabel, mapTrackingStatusLabel } from '@/lib/bean-orders/trackingmore';
import { translateTrackingDetail } from '@/lib/bean-orders/tracking-detail-labels';
import {
  formatThaiAdminAreaLabel,
  resolveThaiAdminAreaNames,
} from '@/lib/bean-orders/thai-postal-lookup';

export type BeanOrderTrackingEvent = {
  at: string;
  status: string;
  statusLabel: string;
  detail: string;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  locationLine: string | null;
};

type TrackInfoRow = {
  checkpoint_date?: string;
  checkpoint_delivery_status?: string;
  tracking_detail?: string;
  location?: string | null;
  city?: string | null;
  state?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseTrackingLocation(
  location: string | null | undefined,
  city?: string | null,
  state?: string | null,
): Pick<BeanOrderTrackingEvent, 'subdistrict' | 'district' | 'province' | 'locationLine'> {
  const provinceFromState = state?.trim() || null;
  const districtFromCity = city?.trim() || null;

  if (location?.trim()) {
    const parts = location
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 3) {
      return {
        subdistrict: parts[0] ?? null,
        district: parts[1] ?? null,
        province: parts[2] ?? null,
        locationLine: location.trim(),
      };
    }

    if (parts.length === 2) {
      return {
        subdistrict: null,
        district: parts[0] ?? null,
        province: parts[1] ?? null,
        locationLine: location.trim(),
      };
    }

    return {
      subdistrict: null,
      district: districtFromCity,
      province: parts[0] ?? provinceFromState,
      locationLine: location.trim(),
    };
  }

  return {
    subdistrict: null,
    district: districtFromCity,
    province: provinceFromState,
    locationLine: [districtFromCity, provinceFromState].filter(Boolean).join(', ') || null,
  };
}

function readTrackInfoRows(raw: unknown): TrackInfoRow[] {
  if (!isRecord(raw)) return [];

  const rows: TrackInfoRow[] = [];
  for (const key of ['origin_info', 'destination_info']) {
    const info = raw[key];
    if (!isRecord(info)) continue;
    const trackinfo = info.trackinfo;
    if (!Array.isArray(trackinfo)) continue;
    for (const item of trackinfo) {
      if (!isRecord(item)) continue;
      rows.push({
        checkpoint_date:
          typeof item.checkpoint_date === 'string' ? item.checkpoint_date : undefined,
        checkpoint_delivery_status:
          typeof item.checkpoint_delivery_status === 'string'
            ? item.checkpoint_delivery_status
            : undefined,
        tracking_detail:
          typeof item.tracking_detail === 'string' ? item.tracking_detail : undefined,
        location: typeof item.location === 'string' ? item.location : null,
        city: typeof item.city === 'string' ? item.city : null,
        state: typeof item.state === 'string' ? item.state : null,
      });
    }
  }

  return rows;
}

function toEvent(row: TrackInfoRow): BeanOrderTrackingEvent | null {
  const at = row.checkpoint_date?.trim();
  const status = row.checkpoint_delivery_status?.trim();
  const detail = row.tracking_detail?.trim();
  if (!at || !status || !detail) return null;

  const location = parseTrackingLocation(row.location, row.city, row.state);
  const resolved = resolveThaiAdminAreaNames(location);

  return {
    at,
    status,
    statusLabel: mapTrackingStatusLabel(status),
    detail: translateTrackingDetail(detail),
    subdistrict: resolved.subdistrict,
    district: resolved.district,
    province: resolved.province,
    locationLine: location.locationLine,
  };
}

function unwrapTrackingRaw(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.data) && !Array.isArray(raw.data)) {
    const inner = raw.data;
    if ('origin_info' in inner || 'delivery_status' in inner) return inner;
  }
  return raw;
}

function parseLatestEventFallback(root: Record<string, unknown>): BeanOrderTrackingEvent | null {
  const latest = typeof root.latest_event === 'string' ? root.latest_event.trim() : '';
  const at = typeof root.latest_checkpoint_time === 'string' ? root.latest_checkpoint_time.trim() : '';
  const status = typeof root.delivery_status === 'string' ? root.delivery_status.trim() : '';
  if (!latest || !at || !status) return null;

  const parts = latest.split(',').map((part) => part.trim()).filter(Boolean);
  const detail = parts[0] ?? latest;
  const locationParts = parts.slice(1).filter((part) => !/^\d{4}-\d{2}-\d{2}/.test(part));
  const locationLine = locationParts.length > 0 ? locationParts.join(', ') : null;

  const location = parseTrackingLocation(locationLine);
  const resolved = resolveThaiAdminAreaNames(location);

  return {
    at,
    status,
    statusLabel: mapTrackingStatusLabel(status),
    detail: translateTrackingDetail(detail),
    subdistrict: resolved.subdistrict,
    district: resolved.district,
    province: resolved.province,
    locationLine: location.locationLine,
  };
}

export function parseTrackingEvents(raw: unknown): BeanOrderTrackingEvent[] {
  const root = unwrapTrackingRaw(raw);
  const rows = readTrackInfoRows(root);
  const seen = new Set<string>();
  const events: BeanOrderTrackingEvent[] = [];

  for (const row of rows) {
    const event = toEvent(row);
    if (!event) continue;
    const key = `${event.at}|${event.status}|${event.detail}|${event.locationLine ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push(event);
  }

  if (events.length === 0 && root) {
    const fallback = parseLatestEventFallback(root);
    if (fallback) events.push(fallback);
  }

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function parseLatestTrackingEvent(raw: unknown): BeanOrderTrackingEvent | null {
  const events = parseTrackingEvents(raw);
  return events[0] ?? null;
}

export function formatLatestTrackingLabel(
  raw: unknown,
  trackingStatus: string | null | undefined,
  options?: {
    fulfillmentStatus?: 'pending' | 'shipped';
    trackingNumber?: string | null;
  },
): string | null {
  if (options?.fulfillmentStatus !== 'shipped') return null;

  const latest = raw ? parseLatestTrackingEvent(raw) : null;
  if (latest?.detail) return latest.detail;

  return formatShipmentTrackingLabel(trackingStatus, options);
}

export function formatTrackingEventDateTime(at: string): { date: string; time: string } {
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) {
    return { date: at, time: '' };
  }

  return {
    date: parsed.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function formatTrackingLocationParts(event: BeanOrderTrackingEvent): string {
  const label = formatThaiAdminAreaLabel(event);
  if (label) return label;
  return event.locationLine ?? '—';
}
