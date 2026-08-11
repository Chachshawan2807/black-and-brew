import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import {
  androidLikelySupportsFaceUnlock,
  detectBiometricKind,
  getBiometricLabels,
  platformPasskeyTransports,
  resolveBiometricKind,
  usesFaceBiometricIcon,
} from '@/lib/passkey/biometric-copy';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('biometric copy', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('keeps Face ID and Touch ID available in iPhone copy', () => {
    expect(detectBiometricKind(IPHONE_UA)).toBe('face');
    expect(getBiometricLabels('th', IPHONE_UA).login).toBe('ใช้ Face ID หรือ Touch ID');
    expect(getBiometricLabels('en', IPHONE_UA).enrollAction).toBe(
      'Enable Face ID or Touch ID'
    );
  });

  test('prefers face-first copy on Android by default', () => {
    expect(detectBiometricKind(ANDROID_UA)).toBe('both');
    expect(getBiometricLabels('th', ANDROID_UA).login).toBe('ใช้ใบหน้าหรือลายนิ้วมือ');
    expect(getBiometricLabels('en', ANDROID_UA).login.startsWith('Use face')).toBe(true);
    expect(usesFaceBiometricIcon(ANDROID_UA)).toBe(true);
  });

  test('keeps both labels on iPad', () => {
    expect(detectBiometricKind(IPAD_UA)).toBe('both');
    expect(getBiometricLabels('th', IPAD_UA).login).toBe('ใช้ใบหน้าหรือลายนิ้วมือ');
  });

  test('resolves Android to fingerprint-only when no camera exists', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn(async () => []),
      },
    });

    await expect(androidLikelySupportsFaceUnlock(ANDROID_UA)).resolves.toBe(false);
    await expect(resolveBiometricKind(ANDROID_UA)).resolves.toBe('fingerprint');
    expect(getBiometricLabels('th', 'fingerprint').login).toBe('ใช้ลายนิ้วมือ');
    expect(usesFaceBiometricIcon('fingerprint')).toBe(false);
  });

  test('resolves Android to face-first when a front camera exists', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn(async () => [
          { kind: 'videoinput', label: 'Front Camera', deviceId: '1' },
        ]),
      },
    });

    await expect(androidLikelySupportsFaceUnlock(ANDROID_UA)).resolves.toBe(true);
    await expect(resolveBiometricKind(ANDROID_UA)).resolves.toBe('both');
  });

  test('never locks platform transports to face-only', () => {
    expect(platformPasskeyTransports(['hybrid', 'internal'])).toEqual(['internal']);
    expect(platformPasskeyTransports([])).toEqual(['internal']);
    expect(platformPasskeyTransports(null)).toEqual(['internal']);
  });
});
