import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('inventory modals dark theme readability', () => {
  it('purchase order tabs use dark text on pastel header', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/PurchaseOrdersModal.tsx'),
      'utf-8',
    );

    expect(code).toContain('text-black/85');
    expect(code).not.toMatch(/inactive[\s\S]*text-foreground hover:bg-muted/);
  });

  it('inventory add modal avoids light-only slate tokens', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );

    const addModalSection = code.slice(code.indexOf('{/* Add Modal */}'), code.indexOf('{/* Delete Confirm Alert */}'));

    expect(addModalSection).toContain('text-muted-foreground');
    expect(addModalSection).toContain('bg-muted hover:bg-muted/80 border border-border');
    expect(addModalSection).not.toContain('text-slate-600');
    expect(addModalSection).not.toContain('bg-slate-50');
  });

  it('globals pastel surface overrides live in utilities layer', () => {
    const css = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/globals.css'),
      'utf-8',
    );

    const utilitiesStart = css.lastIndexOf('@layer utilities');
    const utilitiesBlock = css.slice(utilitiesStart);

    expect(utilitiesBlock).toContain('.bb-pastel-surface :where(.text-foreground)');
    expect(utilitiesBlock).toContain('.bb-pastel-surface input.bg-background::placeholder');
    expect(utilitiesBlock).toContain('color: var(--muted-foreground)');
  });
});
