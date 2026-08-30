import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ViewTransitionNavigation } from '@/components/shell/ViewTransitionNavigation';
import { resetViewTransitionNavigationGenerationForTests } from '@/lib/view-transition';
import { resetViewTransitionNavigationForTests } from '@/lib/view-transition-navigation-state';

const mockPush = vi.fn();
const mockPrefetch = vi.fn();
const mockCloseDrawer = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    prefetch: mockPrefetch,
  }),
  usePathname: () => '/th/bean-orders',
}));

vi.mock('@/hooks/use-mobile-nav-drawer', () => ({
  useMobileNavDrawer: (selector: (state: { closeDrawerForNavigation: () => void }) => unknown) =>
    selector({ closeDrawerForNavigation: mockCloseDrawer }),
}));

function renderInstantNavLink() {
  return render(
    <>
      <ViewTransitionNavigation />
      {/* Instant nav intercepts native anchors via data-bb-nav not Next Link */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional fixture for ViewTransitionNavigation */}
      <a href="/th/bean-orders/order-1" data-bb-nav="instant">
        Order detail
      </a>
    </>,
  );
}

describe('instant nav touch reliability', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPrefetch.mockReset();
    mockCloseDrawer.mockReset();
    resetViewTransitionNavigationForTests();
    resetViewTransitionNavigationGenerationForTests();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, pathname: '/th/bean-orders', origin: 'http://localhost:3000' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('touch pointerup navigates instant links without waiting for click', () => {
    renderInstantNavLink();
    const link = screen.getByRole('link', { name: 'Order detail' });

    fireEvent.pointerDown(link, {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.pointerUp(link, {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX: 40,
      clientY: 40,
    });

    expect(mockPush).toHaveBeenCalledWith('/th/bean-orders/order-1');
  });

  test('touch click after pointerup does not double-navigate', () => {
    renderInstantNavLink();
    const link = screen.getByRole('link', { name: 'Order detail' });

    fireEvent.pointerDown(link, {
      pointerId: 2,
      pointerType: 'touch',
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.pointerUp(link, {
      pointerId: 2,
      pointerType: 'touch',
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    mockPush.mockClear();

    fireEvent.click(link);
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('touch pointerup ignores scroll-like movement', () => {
    renderInstantNavLink();
    const link = screen.getByRole('link', { name: 'Order detail' });

    fireEvent.pointerDown(link, {
      pointerId: 3,
      pointerType: 'touch',
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.pointerUp(link, {
      pointerId: 3,
      pointerType: 'touch',
      button: 0,
      clientX: 40,
      clientY: 72,
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('mouse click still navigates instant links', () => {
    renderInstantNavLink();
    const link = screen.getByRole('link', { name: 'Order detail' });

    fireEvent.click(link, { button: 0 });

    expect(mockPush).toHaveBeenCalledWith('/th/bean-orders/order-1');
  });
});
