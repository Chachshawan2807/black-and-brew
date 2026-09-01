import { describe, expect, test } from 'vitest';
import { SECRETARY_GUIDANCE_SYSTEM } from '@/lib/secretary/guidance-prompt';
import {
  SECRETARY_BRU_IDENTITY,
  finalizeSecretaryGuidanceText,
} from '@/lib/secretary/guidance-voice';

describe('secretary guidance voice', () => {
  test('exports Bru female assistant identity', () => {
    expect(SECRETARY_BRU_IDENTITY).toContain('บรู');
    expect(SECRETARY_BRU_IDENTITY).toContain('ค่ะ');
    expect(SECRETARY_BRU_IDENTITY).toContain('ห้าม "ครับ"');
  });

  test('system prompt requests short natural summary', () => {
    expect(SECRETARY_GUIDANCE_SYSTEM).toContain('บรู');
    expect(SECRETARY_GUIDANCE_SYSTEM).toContain('200 ตัวอักษร');
    expect(SECRETARY_GUIDANCE_SYSTEM).not.toContain('แล้วต่อด้วย');
  });

  test('finalizeSecretaryGuidanceText enforces female politeness', () => {
    expect(finalizeSecretaryGuidanceText('แนะนำเริ่มจากงาน A')).toBe('แนะนำเริ่มจากงาน Aค่ะ');
    expect(finalizeSecretaryGuidanceText('แนะนำเริ่มจากงาน Aนะคะ')).toBe('แนะนำเริ่มจากงาน Aนะคะ');
    expect(finalizeSecretaryGuidanceText('สรุปเรียบร้อยครับ')).toBe('สรุปเรียบร้อยค่ะ');
  });
});
