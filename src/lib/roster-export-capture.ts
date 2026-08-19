import {
  captureElementAsPng,
  downloadPngBlob,
  getCaptureFontEmbedCSS,
  preloadCaptureLibraries,
} from '@/lib/capture-element-png';
import { APP_FONT_FAMILY_CSS } from '@/lib/fonts';
import {
  ROSTER_EXPORT_CELL_HEIGHT,
  ROSTER_EXPORT_GRID_GAP,
  ROSTER_EXPORT_GRID_TEMPLATE,
  ROSTER_EXPORT_GRID_WIDTH,
  ROSTER_EXPORT_ROOT_PADDING,
  ROSTER_EXPORT_ROOT_WIDTH,
} from '@/lib/roster/grid-layout';

const ROSTER_EXPORT_FONT_FORMAT = 'woff2' as const;
export const ROSTER_EXPORT_BG = '#faf9f2';
export const ROSTER_EXPORT_CAPTURING_CLASS = 'bb-roster-export-capturing';
export const ROSTER_EXPORT_SURFACE_CLASS = 'bb-roster-export-surface';
const ROSTER_EXPORT_GRID_SELECTOR = '.bb-roster-export-grid';

const EXPORT_SHADOW_CLASS_HINT =
  /(?:^|\s)(?:shadow(?:-\[|-sm|-md|-lg|-xl|-2xl|-inner|-none)?|drop-shadow)/;

function setInline(
  restores: Map<HTMLElement, Map<string, string>>,
  node: HTMLElement,
  prop: string,
  value: string,
) {
  if (!restores.has(node)) restores.set(node, new Map());
  const saved = restores.get(node)!;
  if (!saved.has(prop)) saved.set(prop, node.style.getPropertyValue(prop));
  node.style.setProperty(prop, value);
}

function resolveRosterExportFontFamily(): string {
  if (typeof window === 'undefined') return APP_FONT_FAMILY_CSS;

  const rootStyle = window.getComputedStyle(document.documentElement);
  const loadedFontFamilies = [
    rootStyle.getPropertyValue('--font-prompt'),
    rootStyle.getPropertyValue('--font-ibm-plex-sans-thai'),
    rootStyle.getPropertyValue('--font-inter'),
  ]
    .map((family) => family.trim())
    .filter(Boolean);

  if (loadedFontFamilies.length === 0) return APP_FONT_FAMILY_CSS;

  return [...loadedFontFamilies, 'system-ui', 'sans-serif'].join(', ');
}

function nodeMayHaveExportShadow(node: HTMLElement): boolean {
  const className = node.className;
  if (typeof className === 'string' && EXPORT_SHADOW_CLASS_HINT.test(className)) return true;
  return node.style.boxShadow !== '' || node.style.filter !== '';
}

function applyRosterExportDayNameLabels(
  grid: HTMLElement,
  restores: Map<HTMLElement, Map<string, string>>,
) {
  for (let i = 0; i < 7 && i < grid.children.length; i++) {
    const header = grid.children[i];
    if (!(header instanceof HTMLElement)) continue;
    header.querySelectorAll<HTMLElement>('span').forEach((span) => {
      if (span.classList.contains('md:hidden')) {
        setInline(restores, span, 'display', 'none');
      }
      if (span.classList.contains('hidden')) {
        setInline(restores, span, 'display', 'inline');
      }
    });
  }
}

function applyRosterExportCalendarCells(
  grid: HTMLElement,
  restores: Map<HTMLElement, Map<string, string>>,
) {
  for (let i = 7; i < grid.children.length; i++) {
    const cell = grid.children[i];
    if (!(cell instanceof HTMLElement)) continue;

    setInline(restores, cell, 'height', ROSTER_EXPORT_CELL_HEIGHT);
    setInline(restores, cell, 'padding', '16px');
    setInline(restores, cell, 'border-radius', '24px');

    const dateLabel = cell.querySelector<HTMLElement>(':scope > span:first-child');
    if (dateLabel) {
      setInline(restores, dateLabel, 'font-size', '18px');
      setInline(restores, dateLabel, 'line-height', '28px');
    }

    const shiftPill = cell.querySelector<HTMLElement>(':scope > div');
    if (shiftPill) {
      setInline(restores, shiftPill, 'padding', '10px');
      setInline(restores, shiftPill, 'border-radius', '12px');
      setInline(restores, shiftPill, 'font-size', '13px');
      setInline(restores, shiftPill, 'line-height', '1.625');
      setInline(restores, shiftPill, 'min-height', '50px');
    }
  }
}

/**
 * Inline export-only layout so mobile PNG matches desktop md breakpoint (Tailwind md: is viewport-based).
 */
export function applyRosterCaptureStyles(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, Map<string, string>>();
  const fontFamily = resolveRosterExportFontFamily();

  setInline(restores, root, 'font-family', fontFamily);
  setInline(restores, root, 'width', ROSTER_EXPORT_ROOT_WIDTH);
  setInline(restores, root, 'max-width', ROSTER_EXPORT_ROOT_WIDTH);
  setInline(restores, root, 'min-width', ROSTER_EXPORT_ROOT_WIDTH);
  setInline(restores, root, 'padding', ROSTER_EXPORT_ROOT_PADDING);
  setInline(restores, root, 'box-sizing', 'border-box');

  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    setInline(restores, node, 'font-family', fontFamily);
  });

  const staffHeader = root.firstElementChild;
  if (staffHeader instanceof HTMLElement) {
    setInline(restores, staffHeader, 'flex-direction', 'row');
    setInline(restores, staffHeader, 'align-items', 'center');
  }

  const grid = root.querySelector<HTMLElement>(ROSTER_EXPORT_GRID_SELECTOR);
  if (grid) {
    setInline(restores, grid, 'gap', ROSTER_EXPORT_GRID_GAP);
    setInline(restores, grid, 'width', ROSTER_EXPORT_GRID_WIDTH);
    setInline(restores, grid, 'max-width', ROSTER_EXPORT_GRID_WIDTH);
    setInline(restores, grid, 'grid-template-columns', ROSTER_EXPORT_GRID_TEMPLATE);

    for (let i = 0; i < 7 && i < grid.children.length; i++) {
      const header = grid.children[i];
      if (!(header instanceof HTMLElement)) continue;
      setInline(restores, header, 'font-size', '12px');
      setInline(restores, header, 'padding', '8px 4px');
    }

    applyRosterExportDayNameLabels(grid, restores);
    applyRosterExportCalendarCells(grid, restores);
  }

  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    if (!nodeMayHaveExportShadow(node)) return;
    const computed = window.getComputedStyle(node);
    if (computed.boxShadow !== 'none') {
      setInline(restores, node, 'box-shadow', 'none');
    }
    if (computed.filter !== 'none') {
      setInline(restores, node, 'filter', 'none');
    }
  });

  return () => {
    restores.forEach((props, node) => {
      props.forEach((prev, prop) => {
        if (prev) node.style.setProperty(prop, prev);
        else node.style.removeProperty(prop);
      });
    });
  };
}

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
    element.classList.add(ROSTER_EXPORT_CAPTURING_CLASS, ROSTER_EXPORT_SURFACE_CLASS);
    const restorePadding = trimRosterExportBottomPadding(element);
    const restoreStyles = applyRosterCaptureStyles(element);
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
      restoreStyles();
      restorePadding();
      element.classList.remove(ROSTER_EXPORT_CAPTURING_CLASS, ROSTER_EXPORT_SURFACE_CLASS);
    }
  });
}

export { downloadPngBlob, preloadCaptureLibraries };
