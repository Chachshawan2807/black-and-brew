import { describe, expect, test } from 'vitest';
import { resolveSameOriginNavigationUrl } from '@/lib/safe-navigation-url';

const ORIGIN = 'https://blackandbrew.vercel.app';

describe('resolveSameOriginNavigationUrl', () => {
  test('allows relative in-app paths', () => {
    expect(resolveSameOriginNavigationUrl('/th/inventory', ORIGIN)).toBe(
      'https://blackandbrew.vercel.app/th/inventory',
    );
  });

  test('blocks external origins', () => {
    expect(resolveSameOriginNavigationUrl('https://evil.example/phish', ORIGIN)).toBeNull();
  });

  test('blocks non-http schemes', () => {
    expect(resolveSameOriginNavigationUrl('javascript:alert(1)', ORIGIN)).toBeNull();
  });
});
