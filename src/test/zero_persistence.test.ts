
import { expect, test, describe } from 'vitest';

function sanitizeNumericInput(value: any) {
  const sanitized = value === '' || value === null || value === undefined ? 0 : Number(value);
  return isNaN(sanitized) ? 0 : sanitized;
}

describe('Inventory Zero Persistence Logic', () => {
  test('should persist 0 when input is 0', () => {
    expect(sanitizeNumericInput(0)).toBe(0);
    expect(sanitizeNumericInput('0')).toBe(0);
  });

  test('should convert empty string to 0', () => {
    expect(sanitizeNumericInput('')).toBe(0);
  });

  test('should convert null/undefined to 0', () => {
    expect(sanitizeNumericInput(null)).toBe(0);
    expect(sanitizeNumericInput(undefined)).toBe(0);
  });

  test('should handle valid numbers correctly', () => {
    expect(sanitizeNumericInput(150)).toBe(150);
    expect(sanitizeNumericInput('25.5')).toBe(25.5);
  });
});
