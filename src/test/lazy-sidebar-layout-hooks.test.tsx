import React, { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, test, vi, afterEach } from 'vitest';
import { LazySidebarLayout } from '@/components/shell/LazySidebarLayout';
import { AppTooltipProvider } from '@/components/providers/AppTooltipProvider';

function HookProbe() {
  const [n] = useState(0);
  return <div data-testid="probe">{n}</div>;
}

vi.mock('@/components/sidebar/SidebarLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="full-layout">{children}</div>
  ),
}));

describe('LazySidebarLayout', () => {
  afterEach(() => {
    vi.resetModules();
  });

  test('loads full layout without hook errors', async () => {
    expect(() =>
      render(
        <AppTooltipProvider>
          <LazySidebarLayout>
            <HookProbe />
          </LazySidebarLayout>
        </AppTooltipProvider>,
      ),
    ).not.toThrow();

    await act(async () => {
      await vi.dynamicImportSettled?.();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId('probe')).toBeTruthy();
    expect(screen.getByTestId('full-layout')).toBeTruthy();
  });
});
