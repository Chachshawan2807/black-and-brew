import { captureElementAsPng, downloadDataUrl } from '@/lib/capture-element-png';

export const SCHEDULE_EXPORT_BG = '#fdfcf0';
export const SCHEDULE_EXPORT_TEXT = '#000000';
export const SCHEDULE_EXPORT_MUTED = 'rgba(0, 0, 0, 0.55)';
export const SCHEDULE_EXPORT_BORDER = 'rgba(0, 0, 0, 0.05)';

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

function hasClassToken(node: Element, token: string): boolean {
  return (
    node.classList.contains(token) ||
    Array.from(node.classList).some((cls) => cls.startsWith(`${token}/`))
  );
}

function hasBorderUtilityClass(node: Element): boolean {
  return Array.from(node.classList).some(
    (cls) =>
      cls === 'border-border' ||
      cls.startsWith('border-border/') ||
      cls === 'border-b' ||
      cls.startsWith('border-b/') ||
      cls === 'border-r' ||
      cls.startsWith('border-r/') ||
      cls === 'border-t' ||
      cls.startsWith('border-t/'),
  );
}

/** Inline light-theme colors so html-to-image clones readable pixels under .dark. */
export function applyScheduleTableCaptureStyles(root: HTMLElement): () => void {
  const restores = new Map<HTMLElement, Map<string, string>>();
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    if (isPastelShiftSurface(node)) continue;

    if (hasClassToken(node, 'text-foreground')) {
      setInline(restores, node, 'color', SCHEDULE_EXPORT_TEXT);
    } else if (hasClassToken(node, 'text-muted-foreground')) {
      setInline(restores, node, 'color', SCHEDULE_EXPORT_MUTED);
    }

    if (hasClassToken(node, 'bg-card') || hasClassToken(node, 'bg-transparent')) {
      if (hasClassToken(node, 'bg-transparent')) {
        setInline(restores, node, 'background-color', 'transparent');
      } else {
        setInline(restores, node, 'background-color', SCHEDULE_EXPORT_BG);
      }
    }

    if (hasBorderUtilityClass(node)) {
      for (const prop of [
        'border-top-color',
        'border-right-color',
        'border-bottom-color',
        'border-left-color',
      ] as const) {
        setInline(restores, node, prop, SCHEDULE_EXPORT_BORDER);
      }
    }
  }

  setInline(restores, root, 'background-color', SCHEDULE_EXPORT_BG);
  setInline(restores, root, 'color', SCHEDULE_EXPORT_TEXT);

  return () => {
    restores.forEach((props, node) => {
      props.forEach((prev, prop) => {
        if (prev) node.style.setProperty(prop, prev);
        else node.style.removeProperty(prop);
      });
    });
  };
}

function isPastelShiftSurface(node: HTMLElement): boolean {
  return node.classList.contains('bb-pastel-surface');
}

export async function withLightDocumentTheme<T>(fn: () => Promise<T>): Promise<T> {
  const html = document.documentElement;
  const hadDark = html.classList.contains('dark');
  if (hadDark) html.classList.remove('dark');
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  try {
    return await fn();
  } finally {
    if (hadDark) html.classList.add('dark');
  }
}

export async function captureScheduleTableAsPng(element: HTMLElement): Promise<string> {
  return withLightDocumentTheme(async () => {
    const restoreStyles = applyScheduleTableCaptureStyles(element);
    try {
      return await captureElementAsPng(element, { backgroundColor: SCHEDULE_EXPORT_BG });
    } finally {
      restoreStyles();
    }
  });
}

export { downloadDataUrl };
