import { isMeaningfulDeviceModel } from '@/lib/format-login-device';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface ParsedUserAgent {
  deviceType: DeviceType;
  deviceVendor: string | null;
  deviceModel: string | null;
  osName: string | null;
  osVersion: string | null;
  browserName: string | null;
  browserVersion: string | null;
}

function parseIosVersion(ua: string): string | null {
  const match = ua.match(/(?:iPhone OS|CPU OS|iPad; CPU OS)\s+([\d_]+)/i);
  return match ? match[1].replace(/_/g, '.') : null;
}

function parseAndroidVersion(ua: string): string | null {
  const match = ua.match(/Android\s+([\d.]+)/i);
  return match ? match[1] : null;
}

function parseWindowsVersion(ua: string): string | null {
  const match = ua.match(/Windows NT\s+([\d.]+)/i);
  if (!match) return null;
  const map: Record<string, string> = {
    '10.0': '10',
    '6.3': '8.1',
    '6.2': '8',
    '6.1': '7',
  };
  return map[match[1]] ?? match[1];
}

function parseBrowser(ua: string): { name: string | null; version: string | null } {
  const rules: Array<{ name: string; pattern: RegExp }> = [
    { name: 'Edge', pattern: /Edg\/([\d.]+)/ },
    { name: 'Chrome', pattern: /Chrome\/([\d.]+)/ },
    { name: 'Firefox', pattern: /Firefox\/([\d.]+)/ },
    { name: 'Safari', pattern: /Version\/([\d.]+).*Safari/ },
  ];

  for (const rule of rules) {
    const match = ua.match(rule.pattern);
    if (match) {
      return { name: rule.name, version: match[1] ?? null };
    }
  }

  return { name: null, version: null };
}

function parseAndroidModel(ua: string): { vendor: string | null; model: string | null } {
  const match = ua.match(/Android\s+[\d.]+;\s*([^;)]+)\)/i);
  if (!match) return { vendor: null, model: null };

  const raw = match[1].trim();
  if (/^SM-/i.test(raw)) return { vendor: 'Samsung', model: raw };
  if (/^Pixel/i.test(raw)) return { vendor: 'Google', model: raw };
  if (/^Redmi|^MI\s/i.test(raw)) return { vendor: 'Xiaomi', model: raw };
  if (/^HUAWEI|^HONOR/i.test(raw)) return { vendor: 'Huawei', model: raw };
  if (!isMeaningfulDeviceModel(raw)) return { vendor: null, model: null };
  return { vendor: null, model: raw };
}

export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent || '';
  const browser = parseBrowser(ua);

  if (/iPad/i.test(ua)) {
    return {
      deviceType: 'tablet',
      deviceVendor: 'Apple',
      deviceModel: 'iPad',
      osName: 'iPadOS',
      osVersion: parseIosVersion(ua),
      browserName: browser.name,
      browserVersion: browser.version,
    };
  }

  if (/iPhone/i.test(ua)) {
    return {
      deviceType: 'mobile',
      deviceVendor: 'Apple',
      deviceModel: 'iPhone',
      osName: 'iOS',
      osVersion: parseIosVersion(ua),
      browserName: browser.name,
      browserVersion: browser.version,
    };
  }

  if (/Android/i.test(ua)) {
    const android = parseAndroidModel(ua);
    return {
      deviceType: /Mobile/i.test(ua) ? 'mobile' : 'tablet',
      deviceVendor: android.vendor,
      deviceModel: android.model,
      osName: 'Android',
      osVersion: parseAndroidVersion(ua),
      browserName: browser.name,
      browserVersion: browser.version,
    };
  }

  if (/Macintosh|Mac OS X/i.test(ua)) {
    const macVersion = ua.match(/Mac OS X\s+([\d_]+)/i);
    return {
      deviceType: 'desktop',
      deviceVendor: 'Apple',
      deviceModel: 'Mac',
      osName: 'macOS',
      osVersion: macVersion ? macVersion[1].replace(/_/g, '.') : null,
      browserName: browser.name,
      browserVersion: browser.version,
    };
  }

  if (/Windows/i.test(ua)) {
    return {
      deviceType: 'desktop',
      deviceVendor: null,
      deviceModel: null,
      osName: 'Windows',
      osVersion: parseWindowsVersion(ua),
      browserName: browser.name,
      browserVersion: browser.version,
    };
  }

  if (/Linux/i.test(ua)) {
    return {
      deviceType: 'desktop',
      deviceVendor: null,
      deviceModel: null,
      osName: 'Linux',
      osVersion: null,
      browserName: browser.name,
      browserVersion: browser.version,
    };
  }

  return {
    deviceType: 'unknown',
    deviceVendor: null,
    deviceModel: null,
    osName: null,
    osVersion: null,
    browserName: browser.name,
    browserVersion: browser.version,
  };
}
