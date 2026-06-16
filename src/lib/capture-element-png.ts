const MAX_CANVAS_PIXELS = 16_777_216;

export type CaptureElementPngOptions = {
  backgroundColor?: string;
  pixelRatio?: number;
  filter?: (node: HTMLElement) => boolean;
};

function resolvePixelRatio(width: number, height: number, requested = 2): number {
  let ratio = requested;
  while (width * height * ratio * ratio > MAX_CANVAS_PIXELS && ratio > 1) {
    ratio -= 0.5;
  }
  return ratio;
}

/**
 * Capture a DOM node as PNG using its full scrollable dimensions (not just the viewport).
 * Handles iOS Safari canvas limits by reducing pixelRatio when needed.
 */
export async function captureElementAsPng(
  element: HTMLElement,
  options: CaptureElementPngOptions = {},
): Promise<string> {
  const fullWidth = element.scrollWidth;
  const fullHeight = element.scrollHeight;
  const pixelRatio = resolvePixelRatio(fullWidth, fullHeight, options.pixelRatio ?? 2);

  const stickyNodes = element.querySelectorAll<HTMLElement>('[class*="sticky"]');
  const previousPosition = new Map<HTMLElement, string>();
  stickyNodes.forEach((node) => {
    previousPosition.set(node, node.style.position);
    node.style.position = 'static';
  });

  try {
    const { toPng } = await import('html-to-image');
    return await toPng(element, {
      quality: 1.0,
      pixelRatio,
      backgroundColor: options.backgroundColor ?? '#ffffff',
      width: fullWidth,
      height: fullHeight,
      cacheBust: true,
      style: {
        margin: '0',
        padding: '0',
        border: 'none',
        boxShadow: 'none',
        maxHeight: 'none',
        overflow: 'visible',
      },
      filter: options.filter,
    });
  } finally {
    stickyNodes.forEach((node) => {
      const prev = previousPosition.get(node);
      node.style.position = prev ?? '';
    });
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
