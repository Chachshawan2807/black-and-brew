/**
 * Builds a function run inside the browser via page.evaluate.
 * Logic mirrors scripts/screenshots/redact-text.ts (longest-first staff names, phone regex).
 */
export function buildAnonymizeFunction(aliasConfig) {
  const { staffNames, phonePattern } = aliasConfig;
  const entries = Object.entries(staffNames).sort((a, b) => b[0].length - a[0].length);

  return function anonymizeDom() {
    const redact = (text) => {
      if (!text) return text;
      let out = text;
      for (const [real, alias] of entries) {
        out = out.split(real).join(alias);
      }
      try {
        const re = new RegExp(phonePattern, 'g');
        out = out.replace(re, '***-***-****');
      } catch {
        /* invalid pattern */
      }
      return out;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const next = redact(node.textContent ?? '');
      if (next !== node.textContent) node.textContent = next;
    }

    document.querySelectorAll('input, textarea').forEach((el) => {
      if ('value' in el && typeof el.value === 'string') {
        el.value = redact(el.value);
      }
    });

    for (const attr of ['aria-label', 'title', 'alt', 'placeholder']) {
      document.querySelectorAll(`[${attr}]`).forEach((el) => {
        const v = el.getAttribute(attr);
        if (v) el.setAttribute(attr, redact(v));
      });
    }
  };
}
