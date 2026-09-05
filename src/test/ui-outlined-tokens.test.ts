import { describe, expect, it } from 'vitest';
import {
  BB_ICON_BADGE_BASE,
  BB_ICON_BADGE_FILL,
  BB_ICON_BADGE_OUTLINE,
  BB_ICON_FRAME,
} from '@/lib/ui-outlined-tokens';

describe('ui-outlined icon badge tokens', () => {
  it('uses black stroke glyphs and black borders on icon frames', () => {
    expect(BB_ICON_BADGE_OUTLINE).toContain('border-black');
    expect(BB_ICON_BADGE_OUTLINE).toContain('text-black');
    expect(BB_ICON_FRAME).toContain(BB_ICON_BADGE_OUTLINE);
    expect(BB_ICON_BADGE_BASE).toContain(BB_ICON_BADGE_OUTLINE);
  });

  it('keeps pastel fills separate from outline styling', () => {
    expect(BB_ICON_BADGE_FILL.payment).toContain('bg-emerald-50');
    expect(BB_ICON_BADGE_FILL.payment).not.toContain('text-emerald');
    expect(BB_ICON_BADGE_FILL.shipping).toContain('bg-[#e8f4ff]');
    expect(BB_ICON_BADGE_FILL.shipping).not.toContain('text-[#1a5276]');
  });
});
