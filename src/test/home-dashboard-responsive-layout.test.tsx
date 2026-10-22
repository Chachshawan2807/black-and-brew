import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-sidebar-toggle', () => ({
  useSidebarHydrated: () => true,
  useSidebarToggle: (selector: (state: { isOpen: boolean }) => unknown) =>
    selector({ isOpen: false }),
}));

import { HomeDashboardFrame } from '@/app/[locale]/home/_components/HomeDashboardFrame';

describe('Home dashboard responsive layout', () => {
  it('keeps sections stacked through tablet widths and splits at desktop', () => {
    render(
      <HomeDashboardFrame workDateIso="2026-10-17">
        <section>Tasks</section>
        <section>Staff</section>
      </HomeDashboardFrame>,
    );

    const contentGrid = screen.getByRole('heading').parentElement?.nextElementSibling;

    expect(contentGrid).toHaveClass('space-y-4');
    expect(contentGrid).toHaveClass('lg:grid', 'lg:grid-cols-2');
    expect(contentGrid).not.toHaveClass('md:grid', 'md:grid-cols-2');
  });
});
