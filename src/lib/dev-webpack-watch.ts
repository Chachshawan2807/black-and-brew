/**
 * Webpack watch ignore for `next dev`.
 * One RegExp so the schema accepts it. Globs in an array do not match Windows paths the same way,
 * and watching `.agent-skills` (20k files) plus `node_modules` blocks the dev server.
 */
export const DEV_WEBPACK_WATCH_IGNORE =
  /[\\/](\.git|\.next|node_modules|\.agent-skills|\.agents|\.cursor|\.impeccable)([\\/]|$)/;

export function devWatchIgnored(pathname: string): boolean {
  return DEV_WEBPACK_WATCH_IGNORE.test(pathname);
}
