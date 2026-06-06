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
  test('should configure TouchSensor and MouseSensor to resolve mobile dragging issues', async () => {
    // Read the page source code file to check if PointerSensor is replaced by TouchSensor and MouseSensor
    const fs = require('fs');
    const path = require('path');
    const pageCode = fs.readFileSync(path.resolve(__dirname, '../app/[locale]/inventory/page.tsx'), 'utf-8');

    // This assertion should fail initially because PointerSensor is used, not TouchSensor & MouseSensor
    expect(pageCode).toContain('TouchSensor');
    expect(pageCode).toContain('MouseSensor');
    expect(pageCode).not.toContain('useSensor(PointerSensor');
  });

  test('should separate order count badge from truncated text to prevent truncation to ellipsis', async () => {
    render(<Page />);
    
    // We expect to find the "สั่งซื้อ" button after loading finishes
    const orderBtn = await screen.findByRole('button', { name: /สั่งซื้อ/i });
    expect(orderBtn).toBeInTheDocument();

    // The order badge should NOT be inside the element containing the text "สั่งซื้อ" that gets truncated.
    // Let's inspect the DOM hierarchy inside the orderBtn.
    const truncateSpan = orderBtn.querySelector('.truncate');
    expect(truncateSpan).toBeInTheDocument();
    
    // The text content of the truncated span should only be "สั่งซื้อ"
    expect(truncateSpan?.textContent?.trim()).toBe('สั่งซื้อ');
  });
});
