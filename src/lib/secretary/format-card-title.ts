/** Split secretary task titles into card-friendly lines without breaking Thai words mid-syllable. */

const COUNT_SUFFIX_RE = /^(.+?)\s*(\(\d+(?:\s+รายการ)?\))$/u;

export function splitSecretaryCardTitle(title: string): string[] {
  const trimmed = title.trim();
  const countMatch = COUNT_SUFFIX_RE.exec(trimmed);

  const headline = countMatch ? countMatch[1].trim() : trimmed;
  const suffix = countMatch ? countMatch[2].trim() : null;

  const lines = splitHeadline(headline);
  if (suffix) lines.push(suffix);
  return lines;
}

function splitHeadline(headline: string): string[] {
  const spaceMatch = /^(.+?)\s+(\S.+)$/u.exec(headline);
  if (spaceMatch && !/^\d+$/u.test(spaceMatch[2].trim())) {
    return [spaceMatch[1].trim(), spaceMatch[2].trim()];
  }

  const roMatch = /^(.+?)(รอ.+)$/u.exec(headline);
  if (roMatch && roMatch[1].length >= 3 && roMatch[2].length >= 4) {
    return [roMatch[1].trim(), roMatch[2].trim()];
  }

  return [headline];
}
