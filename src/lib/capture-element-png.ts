const MAX_CANVAS_PIXELS = 16_777_216;

export type CaptureElementPngOptions = {
  backgroundColor?: string;
  pixelRatio?: number;
  filter?: (node: HTMLElement) => boolean;
  /** Skip remote @font-face / @import fetches (fonts already loaded in-page). */
  skipFonts?: boolean;
};

function resolvePixelRatio(width: number, height: number, requested = 2): number {
  let ratio = requested;
  while (width * height * ratio * ratio > MAX_CANVAS_PIXELS && ratio > 1) {
    ratio -= 0.5;
  }
  return ratio;
}

type ShadowRestore = { boxShadow: string; filter: string };

/** Inline overrides so html-to-image clones flat surfaces (iOS Safari keeps class shadows otherwise). */
function flattenShadowsForCapture(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, ShadowRestore>();
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

  for (const node of nodes) {
    const computed = window.getComputedStyle(node);
    const hasShadow = computed.boxShadow !== 'none';
    const hasFilter = computed.filter !== 'none';
    if (!hasShadow && !hasFilter) continue;

    restores.set(node, {
      boxShadow: node.style.boxShadow,
      filter: node.style.filter,
    });
    if (hasShadow) node.style.boxShadow = 'none';
    if (hasFilter) node.style.filter = 'none';
  }

  return () => {
    restores.forEach(({ boxShadow, filter }, node) => {
      node.style.boxShadow = boxShadow;
      node.style.filter = filter;
    });
  };
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

  const restoreShadows = flattenShadowsForCapture(element);

  try {
    const { toPng } = await import('html-to-image');
    return await toPng(element, {
      quality: 1.0,
      pixelRatio,
      backgroundColor: options.backgroundColor ?? '#ffffff',
      width: fullWidth,
      height: fullHeight,
      cacheBust: true,
      skipFonts: options.skipFonts ?? true,
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
    restoreShadows();
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
