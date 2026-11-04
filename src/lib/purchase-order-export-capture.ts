import {
  captureElementAsPng,
  downloadPngBlob,
  getCaptureFontEmbedCSS,
  preloadCaptureLibraries,
} from '@/lib/capture-element-png';
import { APP_FONT_FAMILY_CSS } from '@/lib/fonts';
import { withLightDocumentTheme } from '@/lib/schedule-export-capture';

export const PO_EXPORT_BG = '#fff3dd';
const PO_EXPORT_FONT_FORMAT = 'woff2' as const;

let poFontEmbedCssCache: string | null = null;

/** @internal Test-only clears embedded font CSS cache between vitest cases. */
export function resetPurchaseOrderExportCaptureCache(): void {
  poFontEmbedCssCache = null;
}

function resolvePurchaseOrderExportFontFamily(): string {
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
    // Non-fatal html-to-image may still embed @font-face rules.
  }
}

async function resolvePurchaseOrderFontEmbedCSS(element: HTMLElement): Promise<string> {
  if (poFontEmbedCssCache) return poFontEmbedCssCache;
  const css = await getCaptureFontEmbedCSS(element, {
    preferredFontFormat: PO_EXPORT_FONT_FORMAT,
  });
  poFontEmbedCssCache = css;
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

/** Inline app font stack so html-to-image matches the purchase order modal. */
export function applyPurchaseOrderCaptureStyles(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, Map<string, string>>();
  const fontFamily = resolvePurchaseOrderExportFontFamily();

  setInline(restores, root, 'font-family', fontFamily);
  root.querySelectorAll<HTMLElement>('*').forEach((node) => {
    setInline(restores, node, 'font-family', fontFamily);
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

export async function capturePurchaseOrderAsPng(
  element: HTMLElement,
  options?: { filter?: (node: HTMLElement) => boolean },
): Promise<Blob> {
  preloadCaptureLibraries();
  return withLightDocumentTheme(async () => {
    await ensureCaptureFontsReady();

    const restoreStyles = applyPurchaseOrderCaptureStyles(element);
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const fontEmbedCSS = await resolvePurchaseOrderFontEmbedCSS(element);

      return await captureElementAsPng(element, {
        backgroundColor: PO_EXPORT_BG,
        preserveOverflow: true,
        skipFonts: false,
        fontEmbedCSS,
        preferredFontFormat: PO_EXPORT_FONT_FORMAT,
        filter: options?.filter,
      });
    } finally {
      restoreStyles();
    }
  });
}

export { downloadPngBlob, preloadCaptureLibraries };
