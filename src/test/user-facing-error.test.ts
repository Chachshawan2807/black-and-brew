import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  logSupabaseError,
  resolveActionError,
  toUserFacingError,
} from '@/lib/user-facing-error';

describe('toUserFacingError', () => {
  test('maps duplicate key / 23505 to Thai copy', () => {
    expect(
      toUserFacingError(
        { code: '23505', message: 'duplicate key value violates unique constraint' },
        'fallback',
      ),
    ).toBe('ข้อมูลซ้ำกับที่มีอยู่แล้ว กรุณาตรวจสอบแล้วลองใหม่');
  });

  test('maps foreign key / 23503', () => {
    expect(
      toUserFacingError({ code: '23503', message: 'foreign key violation' }, 'fallback'),
    ).toBe('ไม่พบข้อมูลที่อ้างอิง กรุณาตรวจสอบแล้วลองใหม่');
  });

  test('maps auth / RLS style failures', () => {
    expect(
      toUserFacingError(
        { code: '42501', message: 'permission denied for table bean_orders' },
        'fallback',
      ),
    ).toBe('ไม่มีสิทธิ์ทำรายการนี้ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง');
  });

  test('maps network failures', () => {
    expect(toUserFacingError(new TypeError('Failed to fetch'), 'fallback')).toBe(
      'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบเน็ตแล้วลองใหม่',
    );
  });

  test('passes through safe Thai messages', () => {
    expect(toUserFacingError('ไม่พบออเดอร์', 'fallback')).toBe('ไม่พบออเดอร์');
  });

  test('uses fallback for raw Postgres English', () => {
    expect(
      toUserFacingError(
        { message: 'column "foo" of relation "bean_orders" does not exist' },
        'บันทึกออเดอร์ไม่สำเร็จ',
      ),
    ).toBe('บันทึกออเดอร์ไม่สำเร็จ');
  });

  test('uses fallback for empty / unknown', () => {
    expect(toUserFacingError(null, 'ลองใหม่')).toBe('ลองใหม่');
    expect(toUserFacingError({}, 'ลองใหม่')).toBe('ลองใหม่');
  });
});

describe('resolveActionError', () => {
  test('uses fallback when error is empty', () => {
    expect(resolveActionError(undefined, 'โหลดไม่สำเร็จ')).toBe('โหลดไม่สำเร็จ');
  });

  test('passes through safe Thai action errors', () => {
    expect(resolveActionError('ไม่พบออเดอร์', 'โหลดไม่สำเร็จ')).toBe('ไม่พบออเดอร์');
  });
});

describe('logSupabaseError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('logs context and supabase fields', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSupabaseError('bean-orders', {
      message: 'boom',
      details: 'detail',
      code: '23505',
      hint: 'hint',
    });
    expect(spy).toHaveBeenCalledWith(
      'Supabase Error (bean-orders):',
      'boom',
      'detail',
      '23505',
      'hint',
    );
  });
});
