import { expect, test, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Inventory Page Mobile Layout & Dnd Fixes (Failing Test First)', () => {
  test('should use shared useSafeDndSensors instead of inline PointerSensor', () => {
    const pageCode = readFileSync(resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'), 'utf-8');

    expect(pageCode).toContain('useSafeDndSensors');
    expect(pageCode).not.toContain('useSensor(PointerSensor');
    expect(pageCode).not.toContain('useSensor(MouseSensor');
    expect(pageCode).not.toContain('useSensor(TouchSensor');
  });

  test('history modal scroll area should use min-h-0 so flex children can scroll on mobile', () => {
    const modalCode = readFileSync(
      resolve(__dirname, '../app/[locale]/inventory/_components/InventoryHistoryModal.tsx'),
      'utf-8',
    );

    expect(modalCode).toMatch(/flex-1 min-h-0[\s\S]*overflow-y-auto/);
    expect(modalCode).toMatch(/overflow-x-auto[\s\S]*?<table/);
  });

  test('history modal table surface uses morning latte cream across full scrollable width', () => {
    const modalCode = readFileSync(
      resolve(__dirname, '../app/[locale]/inventory/_components/InventoryHistoryModal.tsx'),
      'utf-8',
    );

    expect(modalCode).toMatch(/overflow-x-auto[\s\S]*bg-background/);
    expect(modalCode).not.toMatch(/inline-block w-fit max-w-full bg-background/);
    expect(modalCode).toMatch(/inline-block w-max min-w-full bg-background/);
  });

  test('should separate order count badge from truncated text to prevent truncation to ellipsis', () => {
    const barCode = readFileSync(
      resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toMatch(
      /<ShoppingCart[\s\S]*?<span className="truncate">สั่งซื้อ<\/span>\s*\{itemsToOrderCount > 0 &&[\s\S]*shrink-0/,
    );
  });

  test('bulk queue panel keeps items inside a scrollable frame in multi-item mode', () => {
    const barCode = readFileSync(
      resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toMatch(
      /function BulkQueuePanel[\s\S]*รายการในคิว[\s\S]*max-h-\[min\(42dvh,15rem\)\][\s\S]*overflow-y-auto bb-smooth-scroll/,
    );
  });
});

describe('Safe DnD Sensors — mobile long-press guard', () => {
  test('dnd-sensors.ts should export useSafeDndSensors with TouchSensor delay >= 1000ms', () => {
    const sensorCode = readFileSync(resolve(__dirname, '../lib/dnd-sensors.ts'), 'utf-8');

    expect(sensorCode).toContain('TouchSensor');
    expect(sensorCode).toContain('MouseSensor');
    expect(sensorCode).toContain('KeyboardSensor');
    expect(sensorCode).toContain('useSafeDndSensors');

    const delayMatch = sensorCode.match(/delay:\s*(\d+)/);
    expect(delayMatch).not.toBeNull();
    expect(Number(delayMatch![1])).toBeGreaterThanOrEqual(1000);
  });

  test('LiveShiftList should not spread listeners on the article container', () => {
    const code = readFileSync(
      resolve(__dirname, '../app/[locale]/dashboard/_components/LiveShiftList.tsx'),
      'utf-8',
    );

    const lines = code.split('\n');
    const articleLineIdx = lines.findIndex((l: string) => l.includes('<article'));
    const articleBlock = lines.slice(articleLineIdx, articleLineIdx + 6).join('\n');
    expect(articleBlock).not.toContain('{...listeners}');
  });

  test('mobile sortable views register activator refs via SortableDragHandle', () => {
    const files = [
      '../app/[locale]/dashboard/_components/LiveShiftList.tsx',
      '../app/[locale]/inventory/InventoryClient.tsx',
    ];

    for (const file of files) {
      const code = readFileSync(resolve(__dirname, file), 'utf-8');
      expect(code, `${file} should use SortableDragHandle`).toContain('SortableDragHandle');
      expect(code, `${file} should wire setActivatorNodeRef`).toContain('setActivatorNodeRef');
    }
  });

  test('SortableDragHandle skips tooltip wrapper on coarse pointers', () => {
    const code = readFileSync(
      resolve(__dirname, '../components/ui/sortable-drag-handle.tsx'),
      'utf-8',
    );

    expect(code).toContain('useCoarsePointer');
    expect(code).toMatch(/coarsePointer[\s\S]*return handle/);
    expect(code).toContain('onContextMenu');
  });

  test('all sortable components should use useSafeDndSensors', () => {
    const files = [
      '../app/[locale]/dashboard/_components/LiveShiftList.tsx',
      '../app/[locale]/schedule/ScheduleClient.tsx',
      '../app/[locale]/inventory/InventoryClient.tsx',
    ];

    for (const file of files) {
      const code = readFileSync(resolve(__dirname, file), 'utf-8');
      expect(code, `${file} should use useSafeDndSensors`).toContain('useSafeDndSensors');
      expect(code, `${file} should not have inline PointerSensor`).not.toContain('useSensor(PointerSensor');
    }
  });
});
