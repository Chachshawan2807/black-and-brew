/** Detects whether #app-main has no meaningful route content (shell-only blank). */

const MIN_TEXT_CHARS = 8;

const CONTENT_SELECTOR = [
  'table',
  '[role="table"]',
  '[data-testid]',
  '.bb-shimmer',
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  'canvas',
  'dialog',
  'img[src]',
].join(', ');

export function isAppMainVisuallyEmpty(main: HTMLElement | null): boolean {
  if (!main) return true;
  if (main.querySelector(CONTENT_SELECTOR)) return false;
  const text = (main.textContent ?? '').replace(/\s+/g, '').trim();
  return text.length < MIN_TEXT_CHARS;
}

export const PWA_EMPTY_MAIN_RECOVERY_DELAY_MS = 2_000;
