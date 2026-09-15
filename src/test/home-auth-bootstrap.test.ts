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
    expect(bootstrap).toContain('getAuthSessionInfo');
    expect(bootstrap).toContain('loadSecretaryBoard');
    expect(bootstrap).toContain('bb-pin-authenticated');
    expect(bootstrap).toContain('HomeClient');
  });

  test('PinGateway notifies authenticated routes before Supabase session warmup finishes', () => {
    const pin = readFileSync(pinGatewayPath, 'utf-8');
    expect(pin).toMatch(
      /serverSession\.verified[\s\S]*dispatchEvent\(new CustomEvent\('bb-pin-authenticated'\)\)[\s\S]*ensureSupabaseSession/,
    );
  });
});
