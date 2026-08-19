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
  ROSTER_EXPORT_HEADER_ROW_HEIGHT,
  ROSTER_EXPORT_ROOT_PADDING,
  ROSTER_EXPORT_ROOT_WIDTH,
  ROSTER_EXPORT_STAFF_BLOCK_HEIGHT,
  ROSTER_EXPORT_STAFF_MARGIN_BOTTOM,
} from '@/lib/roster/grid-layout';
import { ROSTER_INDIVIDUAL_DAY_LABELS_FULL } from '@/lib/roster/week-start';

const ROSTER_EXPORT_FONT_FORMAT = 'woff2' as const;
export const ROSTER_EXPORT_BG = '#faf9f2';
export const ROSTER_EXPORT_CAPTURING_CLASS = 'bb-roster-export-capturing';
export const ROSTER_EXPORT_SURFACE_CLASS = 'bb-roster-export-surface';
const ROSTER_EXPORT_GRID_SELECTOR = '.bb-roster-export-grid';
const ROSTER_EXPORT_FULL_DAY_NAMES = ROSTER_INDIVIDUAL_DAY_LABELS_FULL;

const EXPORT_SHADOW_CLASS_HINT =
  /(?:^|\s)(?:shadow(?:-\[|-sm|-md|-lg|-xl|-2xl|-inner|-none)?|drop-shadow)/;

type InlineRestore = Map<string, string>;
type HtmlRestore = { props: InlineRestore; html?: string };

function setInline(
  restores: Map<HTMLElement, HtmlRestore>,
  node: HTMLElement,
  prop: string,
  value: string,
  important = false,
) {
  if (!restores.has(node)) restores.set(node, { props: new Map() });
  const entry = restores.get(node)!;
  if (!entry.props.has(prop)) entry.props.set(prop, node.style.getPropertyValue(prop));
  node.style.setProperty(prop, value, important ? 'important' : '');
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

/** Deterministic grid height — avoids mobile off-screen layout returning skinny columns. */
export function computeRosterExportGridHeight(grid: HTMLElement): number {
  const childCount = grid.children.length;
  const headerHeight = parseInt(ROSTER_EXPORT_HEADER_ROW_HEIGHT, 10);
  if (childCount <= 7) return headerHeight;

  const bodyCellCount = childCount - 7;
  const bodyRows = Math.ceil(bodyCellCount / 7);
  const cellHeight = parseInt(ROSTER_EXPORT_CELL_HEIGHT, 10);
  const gap = parseInt(ROSTER_EXPORT_GRID_GAP, 10);
  const rowCount = 1 + bodyRows;

  return headerHeight + bodyRows * cellHeight + (rowCount - 1) * gap;
}

function applyRosterExportDayNameLabels(
  grid: HTMLElement,
  restores: Map<HTMLElement, HtmlRestore>,
) {
  for (let i = 0; i < 7 && i < grid.children.length; i++) {
    const header = grid.children[i];
    if (!(header instanceof HTMLElement)) continue;

    const entry = restores.get(header) ?? { props: new Map() };
    if (!entry.html) entry.html = header.innerHTML;
    restores.set(header, entry);

    header.textContent = ROSTER_EXPORT_FULL_DAY_NAMES[i];
    setInline(restores, header, 'font-size', '12px', true);
    setInline(restores, header, 'padding', '8px 4px', true);
    setInline(restores, header, 'text-align', 'center', true);
  }
}

function applyRosterExportCalendarCells(
  grid: HTMLElement,
  restores: Map<HTMLElement, HtmlRestore>,
) {
  for (let i = 7; i < grid.children.length; i++) {
    const cell = grid.children[i];
    if (!(cell instanceof HTMLElement)) continue;

    setInline(restores, cell, 'height', ROSTER_EXPORT_CELL_HEIGHT, true);
    setInline(restores, cell, 'min-height', ROSTER_EXPORT_CELL_HEIGHT, true);
    setInline(restores, cell, 'max-height', ROSTER_EXPORT_CELL_HEIGHT, true);
    setInline(restores, cell, 'padding', '16px', true);
    setInline(restores, cell, 'border-radius', '24px', true);
    setInline(restores, cell, 'box-sizing', 'border-box', true);

    for (const child of cell.children) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.tagName === 'SPAN') {
        setInline(restores, child, 'font-size', '18px', true);
        setInline(restores, child, 'line-height', '28px', true);
      }
      if (child.tagName === 'DIV') {
        setInline(restores, child, 'padding', '10px', true);
        setInline(restores, child, 'border-radius', '12px', true);
        setInline(restores, child, 'font-size', '13px', true);
        setInline(restores, child, 'line-height', '1.625', true);
        setInline(restores, child, 'min-height', '50px', true);
        setInline(restores, child, 'box-sizing', 'border-box', true);
      }
    }
  }
}

/**
 * Inline export-only layout so mobile PNG matches desktop md breakpoint (Tailwind md: is viewport-based).
 */
export function applyRosterCaptureStyles(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, HtmlRestore>();
  const fontFamily = resolveRosterExportFontFamily();

  setInline(restores, root, 'font-family', fontFamily, true);
  setInline(restores, root, 'width', ROSTER_EXPORT_ROOT_WIDTH, true);
  setInline(restores, root, 'max-width', ROSTER_EXPORT_ROOT_WIDTH, true);
  setInline(restores, root, 'min-width', ROSTER_EXPORT_ROOT_WIDTH, true);
  setInline(restores, root, 'padding', ROSTER_EXPORT_ROOT_PADDING, true);
  setInline(restores, root, 'box-sizing', 'border-box', true);
  setInline(restores, root, 'overflow', 'visible', true);

  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    setInline(restores, node, 'font-family', fontFamily, true);
  });

  const staffHeader = root.firstElementChild;
  if (staffHeader instanceof HTMLElement) {
    setInline(restores, staffHeader, 'flex-direction', 'row', true);
    setInline(restores, staffHeader, 'align-items', 'center', true);
  }

  const grid = root.querySelector<HTMLElement>(ROSTER_EXPORT_GRID_SELECTOR);
  if (grid) {
    setInline(restores, grid, 'gap', ROSTER_EXPORT_GRID_GAP, true);
    setInline(restores, grid, 'width', ROSTER_EXPORT_GRID_WIDTH, true);
    setInline(restores, grid, 'max-width', ROSTER_EXPORT_GRID_WIDTH, true);
    setInline(restores, grid, 'min-width', ROSTER_EXPORT_GRID_WIDTH, true);
    setInline(restores, grid, 'grid-template-columns', ROSTER_EXPORT_GRID_TEMPLATE, true);
    setInline(restores, grid, 'padding-bottom', '0', true);
    setInline(restores, grid, 'margin-bottom', '0', true);

    applyRosterExportDayNameLabels(grid, restores);
    applyRosterExportCalendarCells(grid, restores);
  }

  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    if (!nodeMayHaveExportShadow(node)) return;
    const computed = window.getComputedStyle(node);
    if (computed.boxShadow !== 'none') {
      setInline(restores, node, 'box-shadow', 'none', true);
    }
    if (computed.filter !== 'none') {
      setInline(restores, node, 'filter', 'none', true);
    }
  });

  return () => {
    restores.forEach((entry, node) => {
      if (entry.html !== undefined) {
        node.innerHTML = entry.html;
      }
      entry.props.forEach((prev, prop) => {
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

function getRosterStaffHeader(root: HTMLElement): HTMLElement | null {
  const first = root.firstElementChild;
  if (!(first instanceof HTMLElement)) return null;
  if (first.matches(ROSTER_EXPORT_GRID_SELECTOR)) return null;
  return first;
}

/** Crop capture to header + calendar grid — excludes mobile safe-area padding below grid. */
export function measureRosterExportContentHeight(root: HTMLElement): number {
  const grid = root.querySelector<HTMLElement>(ROSTER_EXPORT_GRID_SELECTOR);
  if (!grid) return root.scrollHeight;

  const paddingBottom = parseFloat(getComputedStyle(root).paddingBottom) || 0;
  const minGridWidth = parseInt(ROSTER_EXPORT_GRID_WIDTH, 10) - 4;
  const gridWidth = grid.getBoundingClientRect().width;

  if (gridWidth >= minGridWidth) {
    const rootRect = root.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    return Math.ceil(gridRect.bottom - rootRect.top + paddingBottom);
  }

  const paddingTop = parseFloat(getComputedStyle(root).paddingTop) || parseInt(ROSTER_EXPORT_ROOT_PADDING, 10);
  const staffHeader = getRosterStaffHeader(root);
  const staffBlockHeight = staffHeader ? ROSTER_EXPORT_STAFF_BLOCK_HEIGHT : 0;
  const staffMarginBottom = staffHeader ? ROSTER_EXPORT_STAFF_MARGIN_BOTTOM : 0;

  return Math.ceil(
    paddingTop +
      staffBlockHeight +
      staffMarginBottom +
      computeRosterExportGridHeight(grid) +
      paddingBottom,
  );
}

/**
 * Clone into a viewport-visible host so mobile browsers lay out the full 840px export width
 * (off-screen hosts often keep the skinny mobile grid and produce a huge empty PNG).
 */
function mountRosterExportClone(element: HTMLElement): {
  clone: HTMLElement;
  host: HTMLDivElement;
  unmount: () => void;
} {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');

  const host = document.createElement('div');
  host.setAttribute('data-roster-export-host', '');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${ROSTER_EXPORT_ROOT_WIDTH}`,
    `min-width:${ROSTER_EXPORT_ROOT_WIDTH}`,
    'max-width:none',
    'overflow:visible',
    'opacity:0',
    'pointer-events:none',
    'z-index:2147483647',
  ].join(';');

  document.body.appendChild(host);
  host.appendChild(clone);

  return {
    clone,
    host,
    unmount: () => host.remove(),
  };
}

export async function captureRosterAsPng(
  element: HTMLElement,
  options?: { filter?: (node: HTMLElement) => boolean },
): Promise<Blob> {
  preloadCaptureLibraries();
  return withLightDocumentTheme(async () => {
    await ensureCaptureFontsReady();

    const { clone, unmount } = mountRosterExportClone(element);
    clone.classList.add(ROSTER_EXPORT_CAPTURING_CLASS, ROSTER_EXPORT_SURFACE_CLASS);
    const restoreStyles = applyRosterCaptureStyles(clone);

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const contentHeight = measureRosterExportContentHeight(clone);
      const fontEmbedCSS = await getCaptureFontEmbedCSS(clone, {
        preferredFontFormat: ROSTER_EXPORT_FONT_FORMAT,
      });

      return await captureElementAsPng(clone, {
        backgroundColor: ROSTER_EXPORT_BG,
        width: parseInt(ROSTER_EXPORT_ROOT_WIDTH, 10),
        height: contentHeight,
        preservePadding: true,
        padding: ROSTER_EXPORT_ROOT_PADDING,
        preserveOverflow: true,
        skipFonts: false,
        fontEmbedCSS,
        preferredFontFormat: ROSTER_EXPORT_FONT_FORMAT,
        filter: options?.filter,
      });
    } finally {
      restoreStyles();
      clone.classList.remove(ROSTER_EXPORT_CAPTURING_CLASS, ROSTER_EXPORT_SURFACE_CLASS);
      unmount();
    }
  });
}

export { downloadPngBlob, preloadCaptureLibraries };
