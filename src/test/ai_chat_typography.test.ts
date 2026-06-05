import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('AI Chat Thai Typography', () => {
  test('applies a dedicated Thai-readable typography class to chat messages', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/ai/AIChatOverlay.tsx'),
      'utf-8'
    );

    expect(source).toContain('thai-chat-readable');
  });

  test('defines Thai chat typography with Thai-first font fallback and readable spacing', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/globals.css'),
      'utf-8'
    );

    expect(css).toContain('.thai-chat-readable');
    expect(css).toContain("font-family: 'IBM Plex Sans Thai', 'Prompt', 'Inter', system-ui, sans-serif;");
    expect(css).toContain('line-height: 1.85;');
    expect(css).toContain('letter-spacing: 0;');
  });
});
