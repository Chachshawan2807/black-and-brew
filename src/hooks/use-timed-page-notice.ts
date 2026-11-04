'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MS = 6000;

export function useTimedPageNotice(timeoutMs = DEFAULT_MS) {
  const [notice, setNotice] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNotice = useCallback(() => {
    setNotice('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showNotice = useCallback(
    (message: string) => {
      setNotice(message);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setNotice('');
        timeoutRef.current = null;
      }, timeoutMs);
    },
    [timeoutMs],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return { notice, showNotice, clearNotice };
}
