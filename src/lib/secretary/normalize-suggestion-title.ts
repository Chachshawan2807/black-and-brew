/** Normalize custom task titles for consolidation keys (not AI-specific). */
export function normalizeSuggestionTitle(title: string): string {
  return title
    .replace(/["'「」]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}
