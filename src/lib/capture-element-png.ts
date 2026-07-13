const MAX_CANVAS_PIXELS = 16_777_216;

export type CaptureElementPngOptions = {
  backgroundColor?: string;
  pixelRatio?: number;
  filter?: (node: HTMLElement) => boolean;
  /** Skip remote @font-face / @import fetches (default true for generic captures). */
  skipFonts?: boolean;
  /** Precomputed @font-face CSS from getFontEmbedCSS — embeds fonts in the PNG. */
  fontEmbedCSS?: string;
  /** Prefer woff2 when embedding web fonts. */
  preferredFontFormat?: 'woff' | 'woff2' | 'truetype' | 'opentype' | 'embedded-opentype' | 'svg' | string;
  /** Keep the root node's authored overflow, useful when border-radius must clip children. */
  preserveOverflow?: boolean;
};

type HtmlToImageModule = typeof import('html-to-image');

let htmlToImageModule: HtmlToImageModule | null = null;
let htmlToImageLoad: Promise<HtmlToImageModule> | null = null;

/** Warm html-to-image while the user hovers/focuses export controls. */
export function preloadCaptureLibraries(): void {
  void loadHtmlToImage();
}

export async function getCaptureFontEmbedCSS(
  element: HTMLElement,
  options: Pick<CaptureElementPngOptions, 'preferredFontFormat'> = {},
): Promise<string> {
  const { getFontEmbedCSS } = await loadHtmlToImage();
  return getFontEmbedCSS(element, {
    preferredFontFormat: options.preferredFontFormat ?? 'woff2',
  });
}

function loadHtmlToImage(): Promise<HtmlToImageModule> {
  if (htmlToImageModule) return Promise.resolve(htmlToImageModule);
  htmlToImageLoad ??= import('html-to-image').then((module) => {
    htmlToImageModule = module;
    return module;
  });
  return htmlToImageLoad;
}

function resolvePixelRatio(width: number, height: number, requested = 2): number {
  let ratio = requested;
  while (width * height * ratio * ratio > MAX_CANVAS_PIXELS && ratio > 1) {
    ratio -= 0.5;
  }
  return ratio;
}

type ShadowRestore = { boxShadow: string; filter: string };

const SHADOW_CLASS_HINT =
  /(?:^|\s)(?:shadow(?:-\[|-sm|-md|-lg|-xl|-2xl|-inner|-none)?|drop-shadow|backdrop-blur)/;

function nodeMayHaveShadowOrFilter(node: HTMLElement): boolean {
  const className = node.className;
  if (typeof className === 'string' && SHADOW_CLASS_HINT.test(className)) return true;
  return node.style.boxShadow !== '' || node.style.filter !== '';
}

/** Inline overrides so html-to-image clones flat surfaces (iOS Safari keeps class shadows otherwise). */
function flattenShadowsForCapture(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, ShadowRestore>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let current = walker.currentNode as HTMLElement | null;
  while (current) {
    if (nodeMayHaveShadowOrFilter(current)) {
      const computed = window.getComputedStyle(current);
      const hasShadow = computed.boxShadow !== 'none';
      const hasFilter = computed.filter !== 'none';
      if (hasShadow || hasFilter) {
        restores.set(current, {
          boxShadow: current.style.boxShadow,
          filter: current.style.filter,
        });
        if (hasShadow) current.style.boxShadow = 'none';
        if (hasFilter) current.style.filter = 'none';
      }
    }
    current = walker.nextNode() as HTMLElement | null;
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
): Promise<Blob> {
  const fullWidth = element.scrollWidth;
  const fullHeight = element.scrollHeight;
  const pixelRatio = resolvePixelRatio(fullWidth, fullHeight, options.pixelRatio ?? 2);

  const stickyNodes = element.querySelectorAll<HTMLElement>('.sticky');
  const previousPosition = new Map<HTMLElement, string>();
  stickyNodes.forEach((node) => {
    previousPosition.set(node, node.style.position);
    node.style.position = 'static';
  });

  const restoreShadows = flattenShadowsForCapture(element);
  const { toBlob } = await loadHtmlToImage();

  try {
    const blob = await toBlob(element, {
      quality: 1.0,
      pixelRatio,
      backgroundColor: options.backgroundColor ?? '#ffffff',
      width: fullWidth,
      height: fullHeight,
      cacheBust: false,
      skipFonts: options.skipFonts ?? true,
      fontEmbedCSS: options.fontEmbedCSS,
      preferredFontFormat: options.preferredFontFormat,
      style: {
        margin: '0',
        padding: '0',
        border: 'none',
        boxShadow: 'none',
        maxHeight: 'none',
        ...(options.preserveOverflow ? {} : { overflow: 'visible' }),
      },
      filter: options.filter,
    });

    if (!blob) {
      throw new Error('PNG capture returned empty blob');
    }

    return blob;
  } finally {
    restoreShadows();
    stickyNodes.forEach((node) => {
      const prev = previousPosition.get(node);
      node.style.position = prev ?? '';
    });
  }
}

export function downloadPngBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** @deprecated Prefer downloadPngBlob — base64 encoding is slower for large captures. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
