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

  it('purchase order export image keeps header on one line and clips rounded corners', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/PurchaseOrdersModal.tsx'),
      'utf-8',
    );

    expect(code).toMatch(/<h2 className="[^"]*whitespace-nowrap[^"]*"/);
    expect(code).toMatch(/isExportMode \? "relative flex flex-col w-full bg-\[#fff3dd\] rounded-3xl overflow-hidden"/);
  });

  it('purchase order detail table clips its header background to rounded top corners', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/PurchaseOrdersModal.tsx'),
      'utf-8',
    );

    expect(code).toContain('"rounded-3xl shadow-sm border overflow-hidden"');
  });

  it('purchase order exports preserve overflow so rounded wrappers clip in PNG capture', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain('preserveOverflow: true');
    expect(fabCode).toContain('preserveOverflow: true');
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
