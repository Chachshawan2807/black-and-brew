const OBSCURED_DEVICE_MODELS = new Set(['k', 'build', 'wv', 'generic', 'mobile']);

export interface LoginDeviceDisplayInput {
  deviceType: string;
  deviceVendor?: string | null;
  deviceModel?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  browserName?: string | null;
  browserVersion?: string | null;
  metadata?: Record<string, unknown>;
}

const DEVICE_TYPE_LABELS: Record<string, { th: string; en: string }> = {
  mobile: { th: 'มือถือ', en: 'Phone' },
  tablet: { th: 'แท็บเล็ต', en: 'Tablet' },
  desktop: { th: 'คอมพิวเตอร์', en: 'Computer' },
  unknown: { th: 'อุปกรณ์ไม่ทราบชื่อ', en: 'Unknown device' },
};

export function isMeaningfulDeviceModel(model: string | null | undefined): boolean {
  if (!model) return false;
  const trimmed = model.trim();
  if (trimmed.length <= 1) return false;
  return !OBSCURED_DEVICE_MODELS.has(trimmed.toLowerCase());
}

function deviceTypeLabel(deviceType: string, isTh: boolean): string {
  const labels = DEVICE_TYPE_LABELS[deviceType] ?? DEVICE_TYPE_LABELS.unknown;
  return isTh ? labels.th : labels.en;
}

function formatOsLabel(osName: string | null | undefined, osVersion: string | null | undefined): string | null {
  if (!osName) return null;
  return osVersion ? `${osName} ${osVersion}` : osName;
}

function formatModelLabel(
  vendor: string | null | undefined,
  model: string | null | undefined
): string | null {
  if (!isMeaningfulDeviceModel(model)) return null;
  const normalized = model!.trim();
  if (vendor === 'Apple' && /^(iPhone|iPad|Mac)$/i.test(normalized)) {
    return normalized;
  }
  const vendorPrefix = vendor ? `${vendor} ` : '';
  return `${vendorPrefix}${normalized}`.trim();
}

export function formatLoginDeviceLabel(input: LoginDeviceDisplayInput, isTh: boolean): string {
  const parts: string[] = [];

  const modelLabel = formatModelLabel(input.deviceVendor, input.deviceModel);
  if (modelLabel) {
    parts.push(modelLabel);
  } else {
    parts.push(deviceTypeLabel(input.deviceType, isTh));
  }

  const osLabel = formatOsLabel(input.osName, input.osVersion);
  if (osLabel) parts.push(osLabel);

  if (input.browserName) {
    parts.push(input.browserName);
  }

  return parts.join(' · ');
}

export function formatLoginDeviceMetadata(
  metadata: Record<string, unknown> | null | undefined,
  isTh: boolean
): string | null {
  if (!metadata) return null;

  const width = metadata.screen_width;
  const height = metadata.screen_height;
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    return isTh ? `หน้าจอ ${width}×${height}` : `Display ${width}×${height}`;
  }

  return null;
}
