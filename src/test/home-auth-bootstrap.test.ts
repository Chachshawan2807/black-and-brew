import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const homePagePath = resolve(__dirname, '../app/[locale]/home/page.tsx');
const bootstrapPath = resolve(
  __dirname,
  '../app/[locale]/home/_components/HomeClientAuthBootstrap.tsx',
);
const pinGatewayPath = resolve(__dirname, '../components/auth/PinGateway.tsx');

describe('home client auth bootstrap', () => {
  test('home page loads board on the client when server auth is still pending', () => {
    const page = readFileSync(homePagePath, 'utf-8');
    expect(page).toContain('HomeClientAuthBootstrap');
    expect(page).not.toContain('กำลังตรวจสอบสิทธิ์');
    expect(page).not.toContain('HomeAuthRefresh');
  });

  test('bootstrap fetches secretary board after server session is verified', () => {
    const bootstrap = readFileSync(bootstrapPath, 'utf-8');
    expect(bootstrap).not.toContain('getAuthSessionInfo');
    expect(bootstrap).toContain('loadSecretaryBoard');
    expect(bootstrap).toContain('readCachedSecretaryBoard');
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
      /serverSession\.verified[\s\S]*registerPushAfterAuthentication\(locale\)/,
    );
  });
});
