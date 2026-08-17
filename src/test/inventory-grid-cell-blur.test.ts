import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { scheduleInventoryGridCellBlur } from '@/lib/inventory-grid-cell-blur';

describe('scheduleInventoryGridCellBlur', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('commits when focus leaves the grid input', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const onCommit = vi.fn();

    scheduleInventoryGridCellBlur({
      inputRef: { current: input },
      siblingDatasetKey: 'mobileColId',
      onCommit,
    });

    vi.runAllTimers();
    expect(onCommit).toHaveBeenCalledTimes(1);

    input.remove();
  });

  test('commits when focus moves to another inventory grid input', () => {
    const current = document.createElement('input');
    const next = document.createElement('input');
    next.dataset.mobileColId = 'stock';
    document.body.append(current, next);
    next.focus();

    const onCommit = vi.fn();
    scheduleInventoryGridCellBlur({
      inputRef: { current },
      siblingDatasetKey: 'mobileColId',
      onCommit,
    });

    vi.runAllTimers();
    expect(onCommit).toHaveBeenCalledTimes(1);

    current.remove();
    next.remove();
  });

  test('skips commit while the same input stays focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const onCommit = vi.fn();
    scheduleInventoryGridCellBlur({
      inputRef: { current: input },
      siblingDatasetKey: 'colId',
      onCommit,
    });

    vi.runAllTimers();
    expect(onCommit).not.toHaveBeenCalled();

    input.remove();
  });
});
