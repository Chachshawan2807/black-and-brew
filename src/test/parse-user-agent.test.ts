import { describe, expect, test } from 'vitest';
import { parseUserAgent } from '@/lib/parse-user-agent';

describe('parseUserAgent', () => {
  test('detects iPhone model and iOS version', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    );

    expect(result.deviceType).toBe('mobile');
    expect(result.deviceVendor).toBe('Apple');
    expect(result.deviceModel).toBe('iPhone');
    expect(result.osName).toBe('iOS');
    expect(result.osVersion).toBe('17.4');
    expect(result.browserName).toBe('Safari');
  });

  test('detects iPad as tablet', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );

    expect(result.deviceType).toBe('tablet');
    expect(result.deviceVendor).toBe('Apple');
    expect(result.deviceModel).toBe('iPad');
    expect(result.osName).toBe('iPadOS');
  });

  test('detects Android phone with Samsung model', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
    );

    expect(result.deviceType).toBe('mobile');
    expect(result.deviceVendor).toBe('Samsung');
    expect(result.deviceModel).toBe('SM-S918B');
    expect(result.osName).toBe('Android');
    expect(result.osVersion).toBe('14');
    expect(result.browserName).toBe('Chrome');
  });

  test('detects desktop Windows Chrome', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    expect(result.deviceType).toBe('desktop');
    expect(result.osName).toBe('Windows');
    expect(result.osVersion).toBe('10');
    expect(result.browserName).toBe('Chrome');
  });
});
