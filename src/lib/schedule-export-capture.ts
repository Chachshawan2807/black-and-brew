import {
  captureElementAsPng,
  downloadPngBlob,
  getCaptureFontEmbedCSS,
  preloadCaptureLibraries,
} from '@/lib/capture-element-png';
import { APP_FONT_FAMILY_CSS } from '@/lib/fonts';
import { SCHEDULE_GRID_TEMPLATE } from '@/lib/schedule/grid-layout';

export const SCHEDULE_EXPORT_BG = '#fdfcf0';
export const SCHEDULE_EXPORT_TEXT = '#000000';
export const SCHEDULE_EXPORT_MUTED = 'rgba(0, 0, 0, 0.55)';
export const SCHEDULE_EXPORT_BORDER = 'rgba(0, 0, 0, 0.05)';
const SCHEDULE_EXPORT_GRID_TEMPLATE = SCHEDULE_GRID_TEMPLATE;
const SCHEDULE_EXPORT_FONT_FORMAT = 'woff2' as const;

let scheduleFontEmbedCssCache: string | null = null;

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

/**
 * Inline only layout-critical export styles. Theme colors come from
 * `.bb-schedule-export-surface` CSS (including under `.dark`).
 */
export function applyScheduleTableCaptureStyles(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, Map<string, string>>();
  const fontFamily = resolveScheduleExportFontFamily();

  setInline(restores, root, 'font-family', fontFamily);
  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    setInline(restores, node, 'font-family', fontFamily);
  });

  root.querySelectorAll<HTMLElement>('.bb-schedule-grid').forEach((node) => {
    setInline(restores, node, 'grid-template-columns', SCHEDULE_EXPORT_GRID_TEMPLATE);
  });

  root.querySelectorAll<HTMLElement>('.bb-schedule-nowrap').forEach((node) => {
    setInline(restores, node, 'white-space', 'nowrap');
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
    const restoreStyles = applyScheduleTableCaptureStyles(element);
    try {
      const fontEmbedCSS = await resolveScheduleFontEmbedCSS(element);
      return await captureElementAsPng(element, {
        backgroundColor: SCHEDULE_EXPORT_BG,
        skipFonts: false,
        fontEmbedCSS,
        preferredFontFormat: SCHEDULE_EXPORT_FONT_FORMAT,
      });
    } finally {
      restoreStyles();
    }
  });
}

export { downloadPngBlob, preloadCaptureLibraries };
