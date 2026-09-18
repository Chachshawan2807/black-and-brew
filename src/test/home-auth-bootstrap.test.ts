import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const homePagePath = resolve(__dirname, '../app/[locale]/home/page.tsx');
const homeEntryPath = resolve(
  __dirname,
  '../app/[locale]/home/_components/HomeClientEntry.tsx',
);
const pinGatewayPath = resolve(__dirname, '../components/auth/PinGateway.tsx');

describe('home client auth bootstrap', () => {
  test('home page falls back to client entry when server auth is still pending', () => {
    const page = readFileSync(homePagePath, 'utf-8');
    expect(page).toContain('HomeClientEntry');
    expect(page).not.toContain('กำลังตรวจสอบสิทธิ์');
    expect(page).not.toContain('HomeAuthRefresh');
    expect(page).toMatch(/if\s*\(\s*!authed\s*\)/);
  });

  test('home entry fetches secretary board on the client with session cache', () => {
    const bootstrap = readFileSync(homeEntryPath, 'utf-8');
    expect(bootstrap).toContain('loadSecretaryBoard');
    expect(bootstrap).toContain('checkAuth');
    expect(bootstrap).toContain('waitForPinReadAccess');
    expect(bootstrap).toContain('readCachedSecretaryBoard');
    expect(bootstrap).toMatch(/readCachedSecretaryBoard\(locale\)/);
    expect(bootstrap).toContain('boardFromCacheOnInitRef');
    expect(bootstrap).toContain('bb-pin-authenticated');
    expect(bootstrap).toContain('HomeClient');
  });

  test('PinGateway registers push after PIN auth with user gesture', () => {
    const pin = readFileSync(pinGatewayPath, 'utf-8');
    expect(pin).toContain('registerPushAfterAuthentication');
    expect(pin).toMatch(
      /completeAuthentication[\s\S]*registerPushAfterAuthentication\(locale,\s*\{ fromUserGesture: true \}\)/,
    );
    expect(pin).toMatch(
      /serverSession\.verified[\s\S]*registerPushAfterAuthentication\(locale,\s*\{ fromUserGesture: true \}\)/,
    );
  });

  test('completeAuthentication announces PIN success before waiting on push', () => {
    const pin = readFileSync(pinGatewayPath, 'utf-8');
    const complete = pin.slice(pin.indexOf('const completeAuthentication'));
    expect(complete.indexOf("CustomEvent('bb-pin-authenticated')")).toBeLessThan(
      complete.indexOf('registerPushAfterAuthentication'),
    );
  });
});
