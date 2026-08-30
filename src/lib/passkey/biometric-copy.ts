export type BiometricKind = 'face' | 'fingerprint' | 'both';

export type BiometricLocale = 'th' | 'en';

const LABELS: Record<
  BiometricKind,
  Record<
    BiometricLocale,
    {
      login: string;
      enrollAction: string;
      enrollBody: string;
      settingsTitle: string;
      settingsBody: string;
      settingsEnabled: string;
      settingsUnsupported: string;
    }
  >
> = {
  // iPhone preference still names Touch ID so fingerprint-only devices stay covered.
  face: {
    th: {
      login: 'ใช้ Face ID หรือ Touch ID',
      enrollAction: 'เปิดใช้ Face ID หรือ Touch ID',
      enrollBody:
        'ครั้งถัดไปเข้าสู่ระบบด้วย Face ID หรือ Touch ID ได้ โดยไม่ต้องพิมพ์รหัส PIN',
      settingsTitle: 'เข้าด้วย Face ID หรือ Touch ID',
      settingsBody: 'ใช้ Face ID หรือ Touch ID แทนการพิมพ์ PIN บนเครื่องที่ไว้ใจ',
      settingsEnabled: 'เปิดใช้ Face ID หรือ Touch ID บนเครื่องนี้แล้ว',
      settingsUnsupported:
        'อุปกรณ์นี้ยังไม่รองรับ Face ID หรือ Touch ID ใช้ PIN ได้ตามปกติ',
    },
    en: {
      login: 'Use Face ID or Touch ID',
      enrollAction: 'Enable Face ID or Touch ID',
      enrollBody: 'Next time, sign in with Face ID or Touch ID no PIN typing needed.',
      settingsTitle: 'Face ID / Touch ID login',
      settingsBody: 'Use Face ID or Touch ID instead of a PIN on trusted devices',
      settingsEnabled: 'Face ID or Touch ID enabled on this device',
      settingsUnsupported:
        'This device does not support Face ID or Touch ID you can still use a PIN.',
    },
  },
  // Fingerprint-only devices (e.g. Android with no front camera).
  fingerprint: {
    th: {
      login: 'ใช้ลายนิ้วมือ',
      enrollAction: 'เปิดใช้ลายนิ้วมือ',
      enrollBody: 'ครั้งถัดไปเข้าสู่ระบบด้วยลายนิ้วมือได้ โดยไม่ต้องพิมพ์รหัส PIN',
      settingsTitle: 'เข้าด้วยลายนิ้วมือ',
      settingsBody: 'ใช้ลายนิ้วมือแทนการพิมพ์ PIN บนเครื่องที่ไว้ใจ',
      settingsEnabled: 'เปิดใช้ลายนิ้วมือบนเครื่องนี้แล้ว',
      settingsUnsupported: 'อุปกรณ์นี้ยังไม่รองรับลายนิ้วมือ ใช้ PIN ได้ตามปกติ',
    },
    en: {
      login: 'Use fingerprint',
      enrollAction: 'Enable fingerprint',
      enrollBody: 'Next time, sign in with fingerprint no PIN typing needed.',
      settingsTitle: 'Fingerprint login',
      settingsBody: 'Use fingerprint instead of a PIN on trusted devices',
      settingsEnabled: 'Fingerprint enabled on this device',
      settingsUnsupported:
        'This device does not support fingerprint you can still use a PIN.',
    },
  },
  // Face-first with fingerprint fallback (Android with face unlock, iPad, desktop).
  both: {
    th: {
      login: 'ใช้ใบหน้าหรือลายนิ้วมือ',
      enrollAction: 'เปิดใช้ใบหน้าหรือลายนิ้วมือ',
      enrollBody:
        'ครั้งถัดไปเข้าสู่ระบบด้วยใบหน้าหรือลายนิ้วมือได้ โดยไม่ต้องพิมพ์รหัส PIN',
      settingsTitle: 'เข้าด้วยใบหน้าหรือลายนิ้วมือ',
      settingsBody: 'ใช้ใบหน้าหรือลายนิ้วมือแทนการพิมพ์ PIN บนเครื่องที่ไว้ใจ',
      settingsEnabled: 'เปิดใช้งานแล้วบนเครื่องนี้',
      settingsUnsupported:
        'อุปกรณ์นี้ยังไม่รองรับใบหน้าหรือลายนิ้วมือ ใช้ PIN ได้ตามปกติ',
    },
    en: {
      login: 'Use face or fingerprint',
      enrollAction: 'Enable face or fingerprint',
      enrollBody: 'Next time, sign in with face or fingerprint no PIN typing needed.',
      settingsTitle: 'Biometric login',
      settingsBody: 'Use face or fingerprint instead of a PIN on trusted devices',
      settingsEnabled: 'Enabled on this device',
      settingsUnsupported: 'This device does not support biometrics you can still use a PIN.',
    },
  },
};

function readUserAgent(userAgent?: string): string {
  return userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
}

/**
 * Sync preference only. Android defaults to face-first (`both`);
 * use `resolveBiometricKind` when camera probing is available.
 * Never restricts WebAuthn the OS still chooses Face / fingerprint.
 */
export function detectBiometricKind(userAgent?: string): BiometricKind {
  const ua = readUserAgent(userAgent);
  if (/iPhone/i.test(ua)) return 'face';
  if (/Android/i.test(ua)) return 'both';
  return 'both';
}

/** True when the device likely has a camera usable for face unlock. */
export async function androidLikelySupportsFaceUnlock(
  userAgent?: string
): Promise<boolean> {
  const ua = readUserAgent(userAgent);
  if (!/Android/i.test(ua)) return false;
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    // Prefer face-first when we cannot probe OS falls back to fingerprint.
    return true;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === 'videoinput');
    if (cameras.length === 0) return false;

    const labeledFront = cameras.some((device) =>
      /front|user|facing|selfie|ใบหน้า/i.test(device.label)
    );
    if (labeledFront) return true;

    // Before camera permission, labels are often empty but a camera still exists.
    // Prefer face-first; Android BiometricPrompt falls back to fingerprint if needed.
    return true;
  } catch {
    return true;
  }
}

/**
 * Android: face-first when face unlock is likely; fingerprint-only otherwise.
 * Other platforms keep the sync preference.
 */
export async function resolveBiometricKind(
  userAgent?: string
): Promise<BiometricKind> {
  const ua = readUserAgent(userAgent);
  if (/iPhone/i.test(ua)) return 'face';
  if (/Android/i.test(ua)) {
    return (await androidLikelySupportsFaceUnlock(ua)) ? 'both' : 'fingerprint';
  }
  return 'both';
}

export function getBiometricLabels(
  locale: BiometricLocale,
  kindOrUserAgent?: BiometricKind | string
): (typeof LABELS)[BiometricKind][BiometricLocale] {
  const kind: BiometricKind =
    kindOrUserAgent === 'face' ||
    kindOrUserAgent === 'fingerprint' ||
    kindOrUserAgent === 'both'
      ? kindOrUserAgent
      : detectBiometricKind(kindOrUserAgent);
  return LABELS[kind][locale];
}

/** Visual preference face icon unless fingerprint-only. */
export function usesFaceBiometricIcon(
  kindOrUserAgent?: BiometricKind | string
): boolean {
  const kind: BiometricKind =
    kindOrUserAgent === 'face' ||
    kindOrUserAgent === 'fingerprint' ||
    kindOrUserAgent === 'both'
      ? kindOrUserAgent
      : detectBiometricKind(kindOrUserAgent);
  return kind !== 'fingerprint';
}

/**
 * Platform passkeys always use the device authenticator.
 * Face unlock and fingerprint both use the `internal` transport.
 */
export function platformPasskeyTransports(
  transports?: string[] | null
): ['internal'] {
  if (transports?.includes('internal')) {
    return ['internal'];
  }
  return ['internal'];
}
