import { describe, expect, test, vi } from 'vitest';
import { getOverlayPortalContainer } from '@/lib/overlay-portal-container';

describe('getOverlayPortalContainer', () => {
  test('returns document.body when no modal dialog is open', () => {
    expect(getOverlayPortalContainer()).toBe(document.body);
  });

  test('returns the last matching open modal dialog from the DOM query', () => {
    const modals = [
      document.createElement('dialog'),
      document.createElement('dialog'),
    ];
    modals.forEach((node) => node.classList.add('bb-modal-dialog'));

    const querySpy = vi
      .spyOn(document, 'querySelectorAll')
      .mockReturnValue(modals as unknown as NodeListOf<Element>);

    expect(getOverlayPortalContainer()).toBe(modals[1]);

    querySpy.mockRestore();
  });
});
