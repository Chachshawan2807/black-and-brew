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

  test('keeps AI chat FAB visible when open and lifts panel above it', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/ai/AIChatOverlay.tsx'),
      'utf-8'
    );
    const layoutCode = fs.readFileSync(
      path.resolve(__dirname, '../lib/floating-action-layout.ts'),
      'utf-8'
    );

    expect(source).not.toMatch(/hideAiChatButton\s*=\s*[^;]*\|\|\s*isOpen/);
    expect(source).toContain('FAB_PANEL_CLEAR_OF_AI_CLASS');
    expect(layoutCode).toContain('FAB_PANEL_CLEAR_OF_AI_CLASS');
    expect(layoutCode).toContain('max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom,0px))]');
  });

  test('chat window shell uses morning latte cream via bg-background token', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/ai/AIChatOverlay.tsx'),
      'utf-8'
    );

    expect(source).toContain('bg-background rounded-3xl');
    expect(source).toContain('bg-background min-w-0');
  });

  test('mobile chat window uses inset anchors without w-full to prevent right-edge overflow', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/ai/AIChatOverlay.tsx'),
      'utf-8'
    );

    expect(source).toContain('max-md:w-auto');
    expect(source).toContain('max-md:max-w-none');
    expect(source).toContain('max-md:left-[calc(1rem+env(safe-area-inset-left,0px))]');
    expect(source).toContain('max-md:right-[calc(1rem+env(safe-area-inset-right,0px))]');
    expect(source).toContain('flex-1 min-h-0');
    expect(source).toContain('overflow-x-hidden');
    expect(source).toContain('shrink-0');
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
