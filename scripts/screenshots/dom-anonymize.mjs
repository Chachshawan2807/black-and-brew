/**
 * Browser-side redaction during capture. Payload must be JSON-serializable.
 * Staff names shorter than 3 chars only replace on exact text-node match (avoids "คาราเมล" bugs).
 */

export function anonymizePayload(aliasConfig, mode) {
  const entries = Object.entries(aliasConfig.staffNames).sort((a, b) => b[0].length - a[0].length);
  return {
    entries,
    phonePattern: aliasConfig.phonePattern,
    mode,
  };
}

export async function runDomAnonymize(page, aliasConfig, mode = 'none') {
  if (mode === 'none') return;

  const payload = anonymizePayload(aliasConfig, mode);
  await page.evaluate(({ entries, phonePattern, mode: redactMode }) => {
    const replaceStaff = (text) => {
      if (!text) return text;
      let out = text;
      for (const [real, alias] of entries) {
        if (real.length < 3) {
          if (out.trim() === real) out = alias;
          continue;
        }
        out = out.split(real).join(alias);
      }
      return out;
    };

    const redact = (text) => {
      if (!text) return text;
      let out = text;
      if (redactMode === 'staff' || redactMode === 'staff-and-pii') {
        out = replaceStaff(out);
      }
      if (redactMode === 'pii' || redactMode === 'staff-and-pii') {
        try {
          const re = new RegExp(phonePattern, 'g');
          out = out.replace(re, '***-***-****');
        } catch {
          /* invalid pattern */
        }
      }
      return out;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const next = redact(node.textContent ?? '');
      if (next !== node.textContent) node.textContent = next;
    }

    if (redactMode === 'pii' || redactMode === 'staff-and-pii') {
      document.querySelectorAll('input, textarea').forEach((el) => {
        if ('value' in el && typeof el.value === 'string') {
          el.value = redact(el.value);
        }
      });
    }

    if (redactMode === 'staff' || redactMode === 'staff-and-pii') {
      for (const attr of ['aria-label', 'title', 'alt']) {
        document.querySelectorAll(`[${attr}]`).forEach((el) => {
          const v = el.getAttribute(attr);
          if (v) el.setAttribute(attr, redact(v));
        });
      }
    }
  }, payload);
}
