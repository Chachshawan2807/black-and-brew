import { render, screen } from '@testing-library/react';
import { expect, test, describe, vi } from 'vitest';
import React from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Supabase to include realtime channels and config query routing
const mockInventoryItems = [
  { id: '1', name: 'ชามะลิ', stock: 1, order_qty: 0, order_point: 5, target_stock: 10, unit: 'ถุง', source: 'Makro', sort_order: 1 }
];

vi.mock('@/lib/supabase', () => {
  const selectMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();
  const orderMock = vi.fn().mockImplementation(() => Promise.resolve({ data: mockInventoryItems, error: null }));
  const singleMock = vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null }));

  const fromMock = vi.fn((table) => {
    if (table === 'inventory_items') {
      return {
        select: selectMock,
        order: orderMock,
      };
    }
    return {
      select: selectMock,
      eq: eqMock,
      single: singleMock,
    };
  });

  return {
    supabase: {
      from: fromMock,
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      })),
      removeChannel: vi.fn(),
    },
  };
});

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

// Mock server actions
vi.mock('@/app/actions/inventory-actions', () => ({
  recordTransaction: vi.fn(),
  fetchTransactionHistory: vi.fn(async () => ({ success: true, data: [] })),
  fetchFrequentItems: vi.fn(async () => ({ success: true, data: [] })),
  deleteInventoryItem: vi.fn(),
}));

// Mock dynamic import
vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="mock-dynamic">Dynamic Modal</div>,
}));

// Import the Page component
import Page from '../app/[locale]/inventory/page';

describe('Inventory Page Mobile Layout & Dnd Fixes (Failing Test First)', () => {
  test('should use shared useSafeDndSensors instead of inline PointerSensor', async () => {
    const fs = require('fs');
    const path = require('path');
    const pageCode = fs.readFileSync(path.resolve(__dirname, '../app/[locale]/inventory/page.tsx'), 'utf-8');

    expect(pageCode).toContain('useSafeDndSensors');
    expect(pageCode).not.toContain('useSensor(PointerSensor');
    expect(pageCode).not.toContain('useSensor(MouseSensor');
    expect(pageCode).not.toContain('useSensor(TouchSensor');
  });

  test('should separate order count badge from truncated text to prevent truncation to ellipsis', async () => {
    render(<Page />);
    
    // We expect to find the "สั่งซื้อ" button after loading finishes
    const orderBtn = await screen.findByRole('button', { name: /สั่งซื้อ/i });
    expect(orderBtn).toBeInTheDocument();

    // The order badge should NOT be inside the element containing the text "สั่งซื้อ" that gets truncated.
    const truncateSpan = orderBtn.querySelector('.truncate');
    expect(truncateSpan).toBeInTheDocument();
    
    // The text content of the truncated span should only be "สั่งซื้อ"
    expect(truncateSpan?.textContent?.trim()).toBe('สั่งซื้อ');
  });
});

describe('Safe DnD Sensors — mobile long-press guard', () => {
  test('dnd-sensors.ts should export useSafeDndSensors with TouchSensor delay >= 1000ms', () => {
    const fs = require('fs');
    const path = require('path');
    const sensorCode = fs.readFileSync(path.resolve(__dirname, '../lib/dnd-sensors.ts'), 'utf-8');

    expect(sensorCode).toContain('TouchSensor');
    expect(sensorCode).toContain('MouseSensor');
    expect(sensorCode).toContain('KeyboardSensor');
    expect(sensorCode).toContain('useSafeDndSensors');

    // delay must be 1000 or higher
    const delayMatch = sensorCode.match(/delay:\s*(\d+)/);
    expect(delayMatch).not.toBeNull();
    expect(Number(delayMatch![1])).toBeGreaterThanOrEqual(1000);
  });

  test('LiveShiftList should not spread listeners on the article container', () => {
    const fs = require('fs');
    const path = require('path');
    const code = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/dashboard/components/LiveShiftList.tsx'),
      'utf-8',
    );

    // The article element must NOT carry {...listeners}
    // We check that there is no line with both "article" and "listeners" close together
    const lines = code.split('\n');
    const articleLineIdx = lines.findIndex((l: string) => l.includes('<article'));
    // The next ~5 lines after <article should not contain listeners spread
    const articleBlock = lines.slice(articleLineIdx, articleLineIdx + 6).join('\n');
    expect(articleBlock).not.toContain('{...listeners}');
  });

  test('all sortable components should use useSafeDndSensors', () => {
    const fs = require('fs');
    const path = require('path');

    const files = [
      '../components/CommandCenterGrid.tsx',
      '../app/[locale]/dashboard/components/LiveShiftList.tsx',
      '../app/[locale]/schedule/ScheduleClient.tsx',
      '../app/[locale]/inventory/page.tsx',
    ];

    for (const file of files) {
      const code = fs.readFileSync(path.resolve(__dirname, file), 'utf-8');
      expect(code, `${file} should use useSafeDndSensors`).toContain('useSafeDndSensors');
      expect(code, `${file} should not have inline PointerSensor`).not.toContain('useSensor(PointerSensor');
    }
  });
});
