import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SegmentTabBar } from '@/components/ui/segment-tab-bar';

describe('SegmentTabBar', () => {
  test('supports arrow key navigation between tabs', () => {
    const tabs = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ];
    let value = 'a';
    const onChange = (id: string) => {
      value = id;
    };

    const { rerender } = render(
      <SegmentTabBar
        tabs={tabs}
        value={value}
        onChange={onChange}
        ariaLabel="Demo tabs"
      />,
    );

    const tablist = screen.getByRole('tablist', { name: 'Demo tabs' });
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    rerender(
      <SegmentTabBar tabs={tabs} value={value} onChange={onChange} ariaLabel="Demo tabs" />,
    );
    expect(screen.getByRole('tab', { name: /Beta/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('renders count badges without affecting tab label', () => {
    render(
      <SegmentTabBar
        tabs={[{ id: 'purchase', label: 'สั่งซื้อ', count: 3 }]}
        value="purchase"
        onChange={() => {}}
        ariaLabel="Ops tabs"
      />,
    );

    expect(screen.getByRole('tab', { name: 'สั่งซื้อ' })).toBeInTheDocument();
  });
});
