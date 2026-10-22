import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockUseTheme, mockSetTheme } = vi.hoisted(() => ({
  mockUseTheme: vi.fn(),
  mockSetTheme: vi.fn(),
}));

vi.mock('next-themes', () => ({ useTheme: mockUseTheme }));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import SidebarThemeToggle from '@/components/sidebar/SidebarThemeToggle';

describe('sidebar theme toggle', () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: mockSetTheme,
    });
  });

  test('shows a single compact theme icon and toggles the theme', async () => {
    const { container } = render(<SidebarThemeToggle locale="th" isOpen={false} />);
    const toggle = await screen.findByRole('switch', { name: 'สลับเป็นธีมมืด' });

    expect(container.querySelectorAll('[data-theme-icon]')).toHaveLength(2);
    const stage = container.querySelector('[data-theme-icon-stage]');
    expect(stage).toHaveAttribute('data-theme', 'light');
    expect(stage?.className).toContain('theme-toggle-icon-stage');
    expect(toggle).toHaveClass('size-10', 'rounded-xl', 'border-border/60', 'bg-card');

    fireEvent.click(toggle);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  test('sequences the sun and moon and respects reduced-motion preferences', () => {
    const styles = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/globals.css'),
      'utf8',
    );

    expect(styles).toContain('.theme-toggle-icon-stage[data-theme="dark"] .theme-toggle-icon-sun');
    expect(styles).toContain('.theme-toggle-icon-stage[data-theme="dark"] .theme-toggle-icon-moon');
    expect(styles).toContain('transition-delay: 850ms, 850ms;');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('transition-duration: 0ms, 0ms !important;');

    const lightSun = styles.match(/\.theme-toggle-icon-stage\[data-theme="light"\] \.theme-toggle-icon-sun\s*\{([^}]*)\}/)?.[1] ?? '';
    const lightMoon = styles.match(/\.theme-toggle-icon-stage\[data-theme="light"\] \.theme-toggle-icon-moon\s*\{([^}]*)\}/)?.[1] ?? '';
    const darkSun = styles.match(/\.theme-toggle-icon-stage\[data-theme="dark"\] \.theme-toggle-icon-sun\s*\{([^}]*)\}/)?.[1] ?? '';
    const darkMoon = styles.match(/\.theme-toggle-icon-stage\[data-theme="dark"\] \.theme-toggle-icon-moon\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(lightSun).toContain('opacity: 1');
    expect(lightMoon).toContain('opacity: 0');
    expect(darkSun).toContain('opacity: 0');
    expect(darkMoon).toContain('opacity: 1');
  });
});

