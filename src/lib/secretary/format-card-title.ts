/** Split secretary task titles into card-friendly lines without breaking Thai words mid-syllable. */

const COUNT_SUFFIX_RE = /^(.+?)\s*(\(\d+(?:\s+รายการ)?\))$/u;
const CARD_TITLE_MAX_LINES = 5;
const CARD_TITLE_MAX_CHARS_PER_LINE = 13;

export function splitSecretaryCardTitle(title: string): string[] {
  const trimmed = title.trim();
  const countMatch = COUNT_SUFFIX_RE.exec(trimmed);

  const headline = countMatch ? countMatch[1].trim() : trimmed;
  const suffix = countMatch ? countMatch[2].trim() : null;

  const lines = splitHeadline(headline);
  if (suffix) lines.push(suffix);
  return lines.slice(0, CARD_TITLE_MAX_LINES);
}

export function resolveSecretaryCardTitleFontClass(lineCount: number): string {
  if (lineCount <= 2) {
    return 'text-[clamp(12px,3.2vw,14px)] leading-[1.35]';
  }
  if (lineCount <= 3.5) {
    return 'text-[clamp(11px,2.9vw,12px)] leading-[1.3]';
  }
  return 'text-[clamp(10px,2.5vw,11px)] leading-[1.25]';
}

function splitHeadline(headline: string): string[] {
  const roMatch = /^(.+?)(รอ.+)$/u.exec(headline);
  if (roMatch && roMatch[1].length >= 3 && roMatch[2].length >= 4 && !headline.includes(' ')) {
    return [roMatch[1].trim(), roMatch[2].trim()];
  }

  if (/\s/u.test(headline)) {
    return wrapWordsIntoLines(headline.split(/\s+/u).filter(Boolean), ' ');
  }

  if (headline.length <= CARD_TITLE_MAX_CHARS_PER_LINE) {
    return [headline];
  }

  return splitLongSegment(headline, CARD_TITLE_MAX_CHARS_PER_LINE);
}

function wrapWordsIntoLines(words: string[], separator: '' | ' ' = ' '): string[] {
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current
      ? separator
        ? `${current}${separator}${word}`
        : `${current}${word}`
      : word;
    if (candidate.length <= CARD_TITLE_MAX_CHARS_PER_LINE) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      if (word.length <= CARD_TITLE_MAX_CHARS_PER_LINE) {
        current = word;
      } else {
        lines.push(...splitLongSegment(word, CARD_TITLE_MAX_CHARS_PER_LINE));
        current = '';
      }
      continue;
    }

    lines.push(...splitLongSegment(word, CARD_TITLE_MAX_CHARS_PER_LINE));
    current = '';
  }

  if (current) {
    if (current.length <= CARD_TITLE_MAX_CHARS_PER_LINE) {
      lines.push(current);
    } else {
      lines.push(...splitLongSegment(current, CARD_TITLE_MAX_CHARS_PER_LINE));
    }
  }
  return lines.slice(0, CARD_TITLE_MAX_LINES);
}

function splitLongSegment(text: string, maxLen: number): string[] {
  const segmented = segmentIntoWords(text);
  if (segmented.length > 1) {
    return wrapWordsIntoLines(segmented, '');
  }

  if (text.length <= maxLen + 4) {
    return [text];
  }

  return chunkByGraphemes(text, maxLen);
}

function segmentIntoWords(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
    return [...segmenter.segment(text)]
      .map((part) => part.segment.trim())
      .filter(Boolean);
  }

  return [text];
}

function chunkByGraphemes(text: string, maxLen: number): string[] {
  const chars = [...text];
  const chunks: string[] = [];
  for (let i = 0; i < chars.length; i += maxLen) {
    chunks.push(chars.slice(i, i + maxLen).join(''));
  }
  return chunks;
}
