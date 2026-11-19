import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { devWatchIgnored, DEV_WEBPACK_WATCH_IGNORE } from '@/lib/dev-webpack-watch';

describe('dev webpack watch ignores', () => {
  test('skips dependency and non-app trees on Windows and POSIX paths', () => {
    expect(DEV_WEBPACK_WATCH_IGNORE).toBeInstanceOf(RegExp);
    expect(devWatchIgnored('C:\\Projects\\black-and-brew\\node_modules\\next\\index.js')).toBe(true);
    expect(devWatchIgnored('C:/Projects/black-and-brew/.agent-skills/skills/foo/SKILL.md')).toBe(true);
    expect(devWatchIgnored('C:/Projects/black-and-brew/.agents/skills/x/SKILL.md')).toBe(true);
    expect(devWatchIgnored('C:/Projects/black-and-brew/.cursor/skills/x/SKILL.md')).toBe(true);
    expect(devWatchIgnored('C:/Projects/black-and-brew/.next/dev/server/app.js')).toBe(true);
    expect(devWatchIgnored('C:/Projects/black-and-brew/src/proxy.ts')).toBe(false);
    expect(devWatchIgnored('C:/Projects/black-and-brew/src/app/[locale]/schedule/page.tsx')).toBe(false);
  });

  test('dev does not compile extra route chunks on idle', () => {
    const preload = fs.readFileSync(
      path.resolve(__dirname, '../lib/route-chunk-preload.ts'),
      'utf-8',
    );
    expect(preload).toContain("process.env.NODE_ENV !== 'development'");
    expect(preload).toContain('shouldPreloadRouteChunks');
  });
});
