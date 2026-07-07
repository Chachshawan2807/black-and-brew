import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('FAB fade presence', () => {
  const root = path.resolve(__dirname, '..');

  test('motion presets export smooth fab trigger animation', () => {
    const motionCode = fs.readFileSync(path.join(root, 'lib/motion-presets.ts'), 'utf-8');

    expect(motionCode).toContain('export const fabTrigger');
    expect(motionCode).toMatch(/opacity:\s*0/);
    expect(motionCode).toMatch(/scale:\s*0\.8/);
  });

  test('FabFadePresence wraps children with AnimatePresence fade', () => {
    const fadeCode = fs.readFileSync(
      path.join(root, 'components/floating/FabFadePresence.tsx'),
      'utf-8',
    );

    expect(fadeCode).toContain('AnimatePresence');
    expect(fadeCode).toContain('fabTrigger');
    expect(fadeCode).toContain('initial={false}');
  });

  test('main FAB triggers use FabFadePresence for stack visibility', () => {
    const quickFab = fs.readFileSync(
      path.join(root, 'app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const aiChat = fs.readFileSync(path.join(root, 'components/ai/AIChatOverlay.tsx'), 'utf-8');
    const notifyFab = fs.readFileSync(
      path.join(root, 'components/notifications/InventoryNotificationFAB.tsx'),
      'utf-8',
    );

    expect(quickFab).toContain('FabFadePresence');
    expect(quickFab).toContain('FAB_STACK_INNER_CLASS');
    expect(aiChat).toContain('FabFadePresence');
    expect(aiChat).toContain('FAB_STACK_INNER_CLASS');
    expect(notifyFab).toContain('FabFadePresence');
    expect(notifyFab).not.toMatch(/if \(hidden\) return null/);
  });
});
