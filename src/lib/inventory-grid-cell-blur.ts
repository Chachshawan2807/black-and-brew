import type { RefObject } from 'react';

type InventoryGridInputDataset = 'mobileColId' | 'colId';

/**
 * Defers grid cell commit until focus settles — iOS/Android often skip blur
 * or reorder blur vs. the next focus when moving between spreadsheet inputs.
 */
export function scheduleInventoryGridCellBlur(params: {
  inputRef: RefObject<HTMLInputElement | null>;
  siblingDatasetKey: InventoryGridInputDataset;
  isCommitting?: () => boolean;
  onCommit: () => void;
}): void {
  window.setTimeout(() => {
    if (params.isCommitting?.()) return;

    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement &&
      active.dataset[params.siblingDatasetKey] !== undefined &&
      active !== params.inputRef.current
    ) {
      params.onCommit();
      return;
    }

    if (params.inputRef.current === document.activeElement) return;
    params.onCommit();
  }, 0);
}
