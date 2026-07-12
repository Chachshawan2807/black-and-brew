import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const tooltipPath = resolve(__dirname, '../components/ui/tooltip.tsx');
const sortableDragHandlePath = resolve(
  __dirname,
  '../components/ui/sortable-drag-handle.tsx',
);
const inventoryClientPath = resolve(
  __dirname,
  '../app/[locale]/inventory/InventoryClient.tsx',
);

describe('hint tooltip portal contract', () => {
  test('TooltipContent portals to document body so hints escape paint containment', () => {
    const source = readFileSync(tooltipPath, 'utf-8');

    expect(source).toMatch(/TooltipPrimitive\.Portal/);
    expect(source).toMatch(
      /<TooltipPrimitive\.Portal>[\s\S]*<TooltipPrimitive\.Content/,
    );
  });

  test('inventory drag handle tooltips open away from row edges on desktop and mobile', () => {
    const handleSource = readFileSync(sortableDragHandlePath, 'utf-8');
    const inventorySource = readFileSync(inventoryClientPath, 'utf-8');

    expect(handleSource).toContain('tipSide');
    expect(handleSource).toMatch(/tipSide\s*=\s*'left'/);
    expect(inventorySource).toMatch(
      /MobileSortableRow[\s\S]*tipSide=["']right["']/,
    );
  });
});
