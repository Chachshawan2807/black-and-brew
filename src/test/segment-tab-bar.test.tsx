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

  test('onChange accepts narrow tab id union from tab definitions', () => {
    type OpsTab = 'purchase' | 'maintenance';
    const tabs = [
      { id: 'purchase' as const, label: 'สั่งซื้อ', count: 2 },
      { id: 'maintenance' as const, label: 'ซ่อมบำรุง', count: 1 },
    ];
    let active: OpsTab = 'purchase';
    const setActive = (id: OpsTab) => {
      active = id;
    };

    render(
      <SegmentTabBar tabs={tabs} value={active} onChange={setActive} ariaLabel="Ops tabs" />,
    );

    fireEvent.click(screen.getByRole('tab', { name: /ซ่อมบำรุง/i }));
    expect(active).toBe('maintenance');
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
