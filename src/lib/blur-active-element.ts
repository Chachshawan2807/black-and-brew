/** Dismiss the software keyboard and clear focused inputs before closing overlays. */
export function blurActiveElement(): void {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }
}
