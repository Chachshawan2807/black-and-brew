/**
 * TDD: Phase 1 — Editable Sort Order & Insert Position
 *
 * RED phase: these tests fail before implementation.
 * GREEN phase: they pass after implementation.
 */
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PAGE_PATH = path.resolve(__dirname, '../app/[locale]/inventory/page.tsx');

describe('Phase 1: Editable sort-order badge on cards', () => {
  test('SortableRow renders an editable sort-order input (data-testid="sort-order-input")', () => {
    const code = fs.readFileSync(PAGE_PATH, 'utf-8');
    expect(code).toContain('data-testid="sort-order-input"');
  });

  test('EditableSortIndex component is defined in inventory page', () => {
    const code = fs.readFileSync(PAGE_PATH, 'utf-8');
    expect(code).toContain('EditableSortIndex');
  });
});

describe('Phase 1: "แทรกที่ลำดับ" field in Add Item modal', () => {
  test('Add modal has insert-position-input (data-testid="insert-position-input")', () => {
    const code = fs.readFileSync(PAGE_PATH, 'utf-8');
    expect(code).toContain('data-testid="insert-position-input"');
  });

  test('newItemInsertPosition state is tracked', () => {
    const code = fs.readFileSync(PAGE_PATH, 'utf-8');
    expect(code).toContain('newItemInsertPosition');
  });

  test('handleAddItemSubmit uses insertPos for position-aware insertion', () => {
    const code = fs.readFileSync(PAGE_PATH, 'utf-8');
    expect(code).toContain('insertPos');
    expect(code).toContain('isAppend');
  });
});
