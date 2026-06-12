import { describe, expect, test } from 'vitest';
import {
  formatLoginDeviceLabel,
  formatLoginDeviceMetadata,
  isMeaningfulDeviceModel,
} from '@/lib/format-login-device';

describe('isMeaningfulDeviceModel', () => {
  test('rejects Chrome Android privacy placeholder K', () => {
    expect(isMeaningfulDeviceModel('K')).toBe(false);
  });

  test('accepts known device models', () => {
    expect(isMeaningfulDeviceModel('iPhone')).toBe(true);
    expect(isMeaningfulDeviceModel('SM-S918B')).toBe(true);
  });
});

describe('formatLoginDeviceLabel', () => {
  test('shows device type, OS version, and browser when model is obscured', () => {
    const label = formatLoginDeviceLabel(
      {
        deviceType: 'mobile',
        deviceModel: 'K',
        osName: 'Android',
        osVersion: '14',
        browserName: 'Chrome',
      },
      true
    );

    expect(label).toBe('มือถือ · Android 14 · Chrome');
  });

  test('shows iPhone with iOS version and Safari', () => {
    const label = formatLoginDeviceLabel(
      {
        deviceType: 'mobile',
        deviceVendor: 'Apple',
        deviceModel: 'iPhone',
        osName: 'iOS',
        osVersion: '17.4',
        browserName: 'Safari',
      },
      true
    );

    expect(label).toBe('iPhone · iOS 17.4 · Safari');
  });

  test('shows Samsung model with Android and Chrome', () => {
    const label = formatLoginDeviceLabel(
      {
        deviceType: 'mobile',
        deviceVendor: 'Samsung',
        deviceModel: 'SM-S918B',
        osName: 'Android',
        osVersion: '14',
        browserName: 'Chrome',
      },
      false
    );

    expect(label).toBe('Samsung SM-S918B · Android 14 · Chrome');
  });

  test('shows desktop Windows with Chrome in English', () => {
    const label = formatLoginDeviceLabel(
      {
        deviceType: 'desktop',
        osName: 'Windows',
        osVersion: '10',
        browserName: 'Chrome',
      },
      false
    );

    expect(label).toBe('Computer · Windows 10 · Chrome');
  });
});

describe('formatLoginDeviceMetadata', () => {
  test('formats screen size from metadata', () => {
    expect(
      formatLoginDeviceMetadata({ screen_width: 390, screen_height: 844 }, true)
    ).toBe('หน้าจอ 390×844');
  });

  test('returns null when metadata is empty', () => {
    expect(formatLoginDeviceMetadata({}, true)).toBeNull();
  });
});
