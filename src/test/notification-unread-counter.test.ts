import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  decrementUnreadCounter,
  incrementUnreadCounter,
  loadUnreadCounter,
  reconcileUnreadCounter,
  resetUnreadCounter,
  saveUnreadCounter,
  UNREAD_COUNTER_KEY,
} from '@/lib/notification-unread-counter';

describe('notification-unread-counter', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    resetUnreadCounter();
  });

  test('increment and decrement track totals beyond stored list size', () => {
    expect(incrementUnreadCounter()).toBe(1);
    expect(incrementUnreadCounter()).toBe(2);
    expect(decrementUnreadCounter()).toBe(1);
    expect(loadUnreadCounter()).toBe(1);
  });

  test('reconcileUnreadCounter never drops below visible list unread', () => {
    saveUnreadCounter(80);
    expect(reconcileUnreadCounter(50)).toBe(80);
    expect(loadUnreadCounter()).toBe(80);
  });

  test('reconcileUnreadCounter raises stored counter when list has more unread', () => {
    saveUnreadCounter(3);
    expect(reconcileUnreadCounter(50)).toBe(50);
    expect(localStorage.getItem(UNREAD_COUNTER_KEY)).toBe('50');
  });

  test('resetUnreadCounter clears persisted value', () => {
    saveUnreadCounter(120);
    resetUnreadCounter();
    expect(loadUnreadCounter()).toBe(0);
  });
});
