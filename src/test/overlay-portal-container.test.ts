import { describe, expect, test, vi } from 'vitest';
import {
  getOverlayPortalContainer,
  resolveOverlayPortalContainer,
  supportsPopoverTopLayer,
} from '@/lib/overlay-portal-container';

describe('overlay portal container', () => {
  test('getOverlayPortalContainer returns document.body when no modal is open', () => {
    expect(getOverlayPortalContainer()).toBe(document.body);
  });

  test('resolveOverlayPortalContainer prefers open dialog from host ref', () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'bb-modal-dialog';
    Object.defineProperty(dialog, 'open', { value: true, configurable: true });

    const hostRef = { current: dialog };
    expect(resolveOverlayPortalContainer(null, hostRef)).toBe(dialog);
  });

  test('resolveOverlayPortalContainer walks open dialogs without :modal selector', () => {
    const closed = document.createElement('dialog');
    closed.className = 'bb-modal-dialog';
    Object.defineProperty(closed, 'open', { value: false, configurable: true });

    const open = document.createElement('dialog');
    open.className = 'bb-modal-dialog';
    Object.defineProperty(open, 'open', { value: true, configurable: true });

    const querySpy = vi
      .spyOn(document, 'querySelectorAll')
      .mockReturnValue([closed, open] as unknown as NodeListOf<Element>);

    expect(resolveOverlayPortalContainer(null, null)).toBe(open);

    querySpy.mockRestore();
  });

  test('supportsPopoverTopLayer reflects showPopover availability', () => {
    expect(typeof supportsPopoverTopLayer()).toBe('boolean');
  });
});
