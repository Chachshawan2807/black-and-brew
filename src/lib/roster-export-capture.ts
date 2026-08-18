import {
  captureElementAsPng,
  downloadPngBlob,
  getCaptureFontEmbedCSS,
  preloadCaptureLibraries,
} from '@/lib/capture-element-png';

const ROSTER_EXPORT_FONT_FORMAT = 'woff2' as const;
export const ROSTER_EXPORT_BG = '#f7f5e8';
export const ROSTER_EXPORT_CAPTURING_CLASS = 'bb-roster-export-capturing';
const ROSTER_EXPORT_GRID_SELECTOR = '.bb-roster-export-grid';

async function withLightDocumentTheme<T>(fn: () => Promise<T>): Promise<T> {
  const html = document.documentElement;
  const hadDark = html.classList.contains('dark');
  if (hadDark) html.classList.remove('dark');
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  try {
    return await fn();
  } finally {
    if (hadDark) html.classList.add('dark');
  }
}

async function ensureCaptureFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await document.fonts.ready;
  } catch {
    // Non-fatal — html-to-image may still embed @font-face rules.
  }
}

/** Crop capture to header + calendar grid — excludes mobile safe-area padding below grid. */
export function measureRosterExportContentHeight(root: HTMLElement): number {
  const grid = root.querySelector(ROSTER_EXPORT_GRID_SELECTOR);
  if (!grid) return root.scrollHeight;

  const rootRect = root.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();
  const paddingBottom = parseFloat(getComputedStyle(root).paddingBottom) || 0;

  return Math.ceil(gridRect.bottom - rootRect.top + paddingBottom);
}

function trimRosterExportBottomPadding(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, { paddingBottom: string; marginBottom: string }>();

  const trimNode = (node: HTMLElement, paddingBottom = '0', marginBottom = '0') => {
    restores.set(node, {
      paddingBottom: node.style.paddingBottom,
      marginBottom: node.style.marginBottom,
    });
    node.style.paddingBottom = paddingBottom;
    node.style.marginBottom = marginBottom;
  };

  trimNode(root);
  const grid = root.querySelector<HTMLElement>(ROSTER_EXPORT_GRID_SELECTOR);
  if (grid) trimNode(grid);

  return () => {
    restores.forEach(({ paddingBottom, marginBottom }, node) => {
      node.style.paddingBottom = paddingBottom;
      node.style.marginBottom = marginBottom;
    });
  };
}

export async function captureRosterAsPng(
  element: HTMLElement,
  options?: { filter?: (node: HTMLElement) => boolean },
): Promise<Blob> {
  preloadCaptureLibraries();
  return withLightDocumentTheme(async () => {
    await ensureCaptureFontsReady();
    element.classList.add(ROSTER_EXPORT_CAPTURING_CLASS);
    const restorePadding = trimRosterExportBottomPadding(element);
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const contentHeight = measureRosterExportContentHeight(element);
      const fontEmbedCSS = await getCaptureFontEmbedCSS(element, {
        preferredFontFormat: ROSTER_EXPORT_FONT_FORMAT,
      });

      return captureElementAsPng(element, {
        backgroundColor: ROSTER_EXPORT_BG,
        height: contentHeight,
        preserveOverflow: true,
        skipFonts: false,
        fontEmbedCSS,
        preferredFontFormat: ROSTER_EXPORT_FONT_FORMAT,
        filter: options?.filter,
      });
    } finally {
      restorePadding();
      element.classList.remove(ROSTER_EXPORT_CAPTURING_CLASS);
    }
  });
}

export { downloadPngBlob, preloadCaptureLibraries };
