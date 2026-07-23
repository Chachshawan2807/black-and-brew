/** Normalize locale app paths for navigation comparisons (/th vs /th/). */
export function normalizeAppPath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}
