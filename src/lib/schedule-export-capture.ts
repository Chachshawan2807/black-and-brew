import {
  captureElementAsPng,
  downloadPngBlob,
  getCaptureFontEmbedCSS,
  preloadCaptureLibraries,
} from '@/lib/capture-element-png';
import { APP_FONT_FAMILY_CSS } from '@/lib/fonts';
import {
  SCHEDULE_EXPORT_DAY_COLUMN_WIDTH,
  SCHEDULE_EXPORT_GRID_TEMPLATE,
  SCHEDULE_EXPORT_HOLIDAY_LINE_CLAMP,
  SCHEDULE_EXPORT_HOLIDAY_MIN_HEIGHT,
  SCHEDULE_EXPORT_TABLE_WIDTH,
} from '@/lib/schedule/grid-layout';

export const SCHEDULE_EXPORT_BG = '#f7f5e8';
export const SCHEDULE_EXPORT_TEXT = '#000000';
export const SCHEDULE_EXPORT_MUTED = 'rgba(0, 0, 0, 0.55)';
export const SCHEDULE_EXPORT_BORDER = 'rgba(0, 0, 0, 0.1)';
export const SCHEDULE_EXPORT_GRID_LINE = 'rgb(0 0 0 / 0.1)';
export const SCHEDULE_EXPORT_CAPTURING_CLASS = 'bb-schedule-export-capturing';
const SCHEDULE_EXPORT_FONT_FORMAT = 'woff2' as const;
const EXPORT_ROW_DIVIDER_SHADOW = `inset 0 -1px 0 ${SCHEDULE_EXPORT_GRID_LINE}`;
const EXPORT_DAY_COLUMN_PX = parseInt(SCHEDULE_EXPORT_DAY_COLUMN_WIDTH, 10);

const EXPORT_SHADOW_CLASS_HINT =
  /(?:^|\s)(?:shadow(?:-\[|-sm|-md|-lg|-xl|-2xl|-inner|-none)?|drop-shadow)/;

function nodeMayHaveExportShadow(node: HTMLElement): boolean {
  const className = node.className;
  if (typeof className === 'string' && EXPORT_SHADOW_CLASS_HINT.test(className)) return true;
  return node.style.boxShadow !== '' || node.style.filter !== '';
}

let scheduleFontEmbedCssCache: string | null = null;

/** @internal Test-only — clears embedded font CSS cache between vitest cases. */
export function resetScheduleExportCaptureCache(): void {
  scheduleFontEmbedCssCache = null;
}

function resolveScheduleExportFontFamily(): string {
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

async function ensureCaptureFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await document.fonts.ready;
  } catch {
    // Non-fatal — html-to-image may still embed @font-face rules.
  }
}

async function resolveScheduleFontEmbedCSS(element: HTMLElement): Promise<string> {
  if (scheduleFontEmbedCssCache) return scheduleFontEmbedCssCache;
  const css = await getCaptureFontEmbedCSS(element, {
    preferredFontFormat: SCHEDULE_EXPORT_FONT_FORMAT,
  });
  scheduleFontEmbedCssCache = css;
  return css;
}

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

function applyScheduleExportRowDividers(
  root: HTMLElement,
  restores: Map<HTMLElement, Map<string, string>>,
) {
  root.querySelectorAll<HTMLElement>('.bb-schedule-grid > *').forEach((node) => {
    setInline(restores, node, 'border-bottom', `1px solid ${SCHEDULE_EXPORT_GRID_LINE}`);
    setInline(restores, node, 'box-shadow', EXPORT_ROW_DIVIDER_SHADOW);
  });
}

function applyScheduleExportHolidayLayout(
  root: HTMLElement,
  restores: Map<HTMLElement, Map<string, string>>,
) {
  root.querySelectorAll<HTMLElement>('.bb-schedule-holiday-cell').forEach((node) => {
    setInline(restores, node, 'min-height', SCHEDULE_EXPORT_HOLIDAY_MIN_HEIGHT);
    setInline(restores, node, 'height', 'auto');
    setInline(restores, node, 'min-width', '0');
    setInline(restores, node, 'max-width', '100%');
    setInline(restores, node, 'width', '100%');
    setInline(restores, node, 'overflow', 'hidden');
    setInline(restores, node, 'align-items', 'center');
  });

  root.querySelectorAll<HTMLElement>('.bb-schedule-holiday-label').forEach((node) => {
    setInline(restores, node, 'white-space', 'normal');
    setInline(restores, node, 'display', '-webkit-box');
    setInline(restores, node, '-webkit-line-clamp', String(SCHEDULE_EXPORT_HOLIDAY_LINE_CLAMP));
    setInline(restores, node, '-webkit-box-orient', 'vertical');
    setInline(restores, node, 'overflow', 'hidden');
    setInline(restores, node, 'line-height', '1.375');
    setInline(restores, node, 'word-break', 'break-word');
    setInline(restores, node, 'overflow-wrap', 'anywhere');
    setInline(restores, node, 'max-width', '100%');
    setInline(restores, node, 'width', '100%');
    setInline(restores, node, 'text-transform', 'none');
  });
}

function finalizeScheduleExportHolidayLayout(
  root: HTMLElement,
  restores: Map<HTMLElement, Map<string, string>>,
) {
  root.querySelectorAll<HTMLElement>('.bb-schedule-holiday-label').forEach((label) => {
    setInline(restores, label, 'max-width', `${EXPORT_DAY_COLUMN_PX}px`);
    setInline(restores, label, 'width', `${EXPORT_DAY_COLUMN_PX}px`);
  });
}

/**
 * Fixed equal column widths for PNG export — same layout with or without long holiday names.
 */
export function buildScheduleExportGridTemplate(_root: HTMLElement): string {
  return SCHEDULE_EXPORT_GRID_TEMPLATE;
}

/**
 * Inline export-only layout prep. Applies fixed column widths so every row aligns.
 */
export function applyScheduleTableCaptureStyles(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, Map<string, string>>();
  const fontFamily = resolveScheduleExportFontFamily();

  setInline(restores, root, 'font-family', fontFamily);
  setInline(restores, root, 'min-width', '0');
  setInline(restores, root, 'width', SCHEDULE_EXPORT_TABLE_WIDTH);
  setInline(restores, root, 'max-width', SCHEDULE_EXPORT_TABLE_WIDTH);
  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    setInline(restores, node, 'font-family', fontFamily);
  });

  root.querySelectorAll<HTMLElement>('.bb-schedule-grid').forEach((node) => {
    setInline(restores, node, 'transform', 'none');
    setInline(restores, node, 'align-items', 'stretch');
    setInline(restores, node, 'border-bottom-width', '0');
    setInline(restores, node, 'grid-template-columns', SCHEDULE_EXPORT_GRID_TEMPLATE);
    setInline(restores, node, 'width', SCHEDULE_EXPORT_TABLE_WIDTH);
    setInline(restores, node, 'max-width', SCHEDULE_EXPORT_TABLE_WIDTH);
  });

  root.querySelectorAll<HTMLElement>('.bb-schedule-nowrap').forEach((node) => {
    setInline(restores, node, 'white-space', 'nowrap');
  });

  root.querySelectorAll<HTMLElement>('.bb-schedule-drag-handle').forEach((node) => {
    setInline(restores, node, 'display', 'none');
  });

  root.querySelectorAll<HTMLElement>('.bb-schedule-name-cell').forEach((node) => {
    setInline(restores, node, 'filter', 'none');
    setInline(restores, node, 'border-right', `1px solid ${SCHEDULE_EXPORT_GRID_LINE}`);
    setInline(restores, node, 'height', '100%');
    setInline(restores, node, 'box-sizing', 'border-box');
  });

  root.querySelectorAll<HTMLElement>('.bb-schedule-grid > :not(.bb-schedule-name-cell)').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    setInline(restores, node, 'height', '100%');
    setInline(restores, node, 'box-sizing', 'border-box');
  });

  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    if (!nodeMayHaveExportShadow(node)) return;
    if (node.parentElement?.classList.contains('bb-schedule-grid')) return;
    const computed = window.getComputedStyle(node);
    if (computed.boxShadow !== 'none') {
      setInline(restores, node, 'box-shadow', 'none');
    }
    if (computed.filter !== 'none') {
      setInline(restores, node, 'filter', 'none');
    }
  });

  applyScheduleExportHolidayLayout(root, restores);
  finalizeScheduleExportHolidayLayout(root, restores);
  applyScheduleExportRowDividers(root, restores);

  return () => {
    restores.forEach((props, node) => {
      props.forEach((prev, prop) => {
        if (prev) node.style.setProperty(prop, prev);
        else node.style.removeProperty(prop);
      });
    });
  };
}

export async function withLightDocumentTheme<T>(fn: () => Promise<T>): Promise<T> {
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

export async function captureScheduleTableAsPng(element: HTMLElement): Promise<Blob> {
  preloadCaptureLibraries();
  return withLightDocumentTheme(async () => {
    await ensureCaptureFontsReady();
    element.classList.add(SCHEDULE_EXPORT_CAPTURING_CLASS);
    const restoreStyles = applyScheduleTableCaptureStyles(element);
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const fontEmbedCSS = await resolveScheduleFontEmbedCSS(element);
      return await captureElementAsPng(element, {
        backgroundColor: SCHEDULE_EXPORT_BG,
        skipFonts: false,
        fontEmbedCSS,
        preferredFontFormat: SCHEDULE_EXPORT_FONT_FORMAT,
      });
    } finally {
      restoreStyles();
      element.classList.remove(SCHEDULE_EXPORT_CAPTURING_CLASS);
    }
  });
}

export { downloadPngBlob, preloadCaptureLibraries };
