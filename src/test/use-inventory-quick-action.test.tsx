import React, { useEffect, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useInventoryQuickAction } from '@/hooks/use-inventory-quick-action';
import {
  recordBulkInventoryTransactions,
  recordTransaction,
  updateInventoryStock,
} from '@/app/actions/inventory-actions';
import { saveInventoryQuickActionDraft } from '@/lib/inventory-quick-action-draft';

vi.mock('@/app/actions/inventory-actions', () => ({
  recordBulkInventoryTransactions: vi.fn(),
  recordTransaction: vi.fn(),
  updateInventoryStock: vi.fn(),
}));

vi.mock('@/lib/client-session', () => ({
  getClientSessionId: () => 'test-session',
}));

type TestItem = {
  id: string;
  name: string;
  stock: number;
  unit: string;
};

const initialItems: TestItem[] = [
  { id: 'beans', name: 'Beans', stock: 5, unit: 'kg' },
  { id: 'milk', name: 'Milk', stock: 3, unit: 'l' },
];

function QuickActionHarness({
  onAfterSave = vi.fn(),
  startingItems = initialItems,
  isItemsLoaded = true,
}: {
  onAfterSave?: () => void;
  startingItems?: TestItem[];
  isItemsLoaded?: boolean;
}) {
  const [items, setItems] = useState(startingItems);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync test harness items when props change
    setItems(startingItems);
  }, [startingItems]);

  const quickAction = useInventoryQuickAction({
    items,
    setItems,
    isReadOnly: false,
    isItemsLoaded,
    notificationSource: 'inventory_quick_action_bar',
    onAfterSave,
  });

  return (
    <form onSubmit={quickAction.handleQuickSubmit}>
      <output data-testid="quick-search">{quickAction.quickSearch}</output>
      <output data-testid="quick-qty">{quickAction.quickQty}</output>
      <output data-testid="search-focused">{String(quickAction.isSearchFocused)}</output>
      <output data-testid="quick-pending">{String(quickAction.isQuickPending)}</output>
      <output data-testid="bulk-ready">{String(quickAction.bulkSubmitReady)}</output>
      <output data-testid="bulk-count">{String(quickAction.bulkQueue.length)}</output>
      <output data-testid="bulk-mode">{String(quickAction.bulkMode)}</output>
      <button
        type="button"
        onClick={() => {
          quickAction.setQuickType('IN');
          quickAction.setQuickSearch('Beans');
          quickAction.setQuickQty('2');
          quickAction.setIsSearchFocused(true);
        }}
      >
        fill-normal-in
      </button>
      <button
        type="button"
        onClick={() => {
          quickAction.setQuickType('ADJUST');
          quickAction.setQuickSearch('Beans');
          quickAction.setQuickQty('8');
          quickAction.setIsSearchFocused(true);
        }}
      >
        fill-normal-adjust
      </button>
      <button type="button" onClick={() => quickAction.setBulkMode(true)}>
        bulk-on
      </button>
      <button type="button" onClick={() => quickAction.selectBulkQuickItem(initialItems[1])}>
        add-milk
      </button>
      <button type="button" onClick={() => quickAction.setBulkLineQty('milk', '2')}>
        qty-milk
      </button>
      <button type="button" onClick={() => quickAction.setIsSearchFocused(false)}>
        click-away
      </button>
      <button type="submit">save</button>
    </form>
  );
}

describe('useInventoryQuickAction save reset behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('clears and closes normal quick entry state after a successful save', async () => {
    const onAfterSave = vi.fn();
    vi.mocked(recordTransaction).mockResolvedValue({ success: true, newStock: 7 });

    render(<QuickActionHarness onAfterSave={onAfterSave} />);

    fireEvent.click(screen.getByText('fill-normal-in'));
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => expect(recordTransaction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('quick-search')).toHaveTextContent(''));

    expect(screen.getByTestId('quick-qty')).toHaveTextContent('');
    expect(screen.getByTestId('search-focused')).toHaveTextContent('false');
    expect(onAfterSave).toHaveBeenCalledTimes(1);
  });

  test('keeps quick submit pending until the server action settles', async () => {
    let resolveSave: (value: { success: true; newStock: number }) => void = () => {};
    vi.mocked(recordTransaction).mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      }) as ReturnType<typeof recordTransaction>,
    );

    render(<QuickActionHarness />);

    fireEvent.click(screen.getByText('fill-normal-in'));
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => expect(recordTransaction).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('quick-pending')).toHaveTextContent('true');

    resolveSave({ success: true, newStock: 7 });

    await waitFor(() => expect(screen.getByTestId('quick-pending')).toHaveTextContent('false'));
    expect(screen.getByTestId('quick-search')).toHaveTextContent('');
  });

  test('can save bulk entries after a normal adjust save resets the quick state', async () => {
    const onAfterSave = vi.fn();
    vi.mocked(updateInventoryStock).mockResolvedValue({ success: true, newStock: 8 });
    vi.mocked(recordBulkInventoryTransactions).mockResolvedValue({
      success: true,
      error: null,
      results: [{ itemId: 'milk', success: true, newStock: 5, error: undefined }],
    });

    render(<QuickActionHarness onAfterSave={onAfterSave} />);

    fireEvent.click(screen.getByText('fill-normal-adjust'));
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => expect(updateInventoryStock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('search-focused')).toHaveTextContent('false'));

    fireEvent.click(screen.getByText('bulk-on'));
    fireEvent.click(screen.getByText('add-milk'));
    fireEvent.click(screen.getByText('qty-milk'));

    await waitFor(() => expect(screen.getByTestId('bulk-ready')).toHaveTextContent('true'));

    fireEvent.click(screen.getByText('save'));

    await waitFor(() =>
      expect(recordBulkInventoryTransactions).toHaveBeenCalledWith(
        [{ itemId: 'milk', type: 'IN', quantity: 2 }],
        'Quick Entry - Bulk',
        expect.objectContaining({ notificationSource: 'inventory_quick_action_bar' }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId('bulk-count')).toHaveTextContent('0'));
    expect(onAfterSave).toHaveBeenCalledTimes(2);
  });

  test('keeps unsaved bulk queue when clicking away from the quick search', async () => {
    render(<QuickActionHarness />);

    fireEvent.click(screen.getByText('bulk-on'));
    fireEvent.click(screen.getByText('add-milk'));
    fireEvent.click(screen.getByText('qty-milk'));

    await waitFor(() => expect(screen.getByTestId('bulk-ready')).toHaveTextContent('true'));

    fireEvent.click(screen.getByText('click-away'));

    expect(screen.getByTestId('search-focused')).toHaveTextContent('false');
    expect(screen.getByTestId('bulk-count')).toHaveTextContent('1');
    expect(screen.getByTestId('bulk-ready')).toHaveTextContent('true');
  });

  test('keeps draft bulk queue during reload while inventory items are still loading', async () => {
    saveInventoryQuickActionDraft({
      bulkMode: true,
      bulkQueue: [
        {
          itemId: 'milk',
          name: 'Milk',
          unit: 'l',
          currentStock: 3,
          qty: '2',
        },
      ],
      quickSearch: '',
      quickQty: '',
      quickType: 'IN',
    });

    const { rerender } = render(<QuickActionHarness startingItems={[]} isItemsLoaded={false} />);

    await waitFor(() => expect(screen.getByTestId('bulk-mode')).toHaveTextContent('true'));
    expect(screen.getByTestId('bulk-count')).toHaveTextContent('1');
    expect(screen.getByTestId('bulk-ready')).toHaveTextContent('true');

    rerender(<QuickActionHarness startingItems={initialItems} isItemsLoaded={true} />);

    await waitFor(() => expect(screen.getByTestId('bulk-count')).toHaveTextContent('1'));
    expect(screen.getByTestId('bulk-ready')).toHaveTextContent('true');
  });
});
