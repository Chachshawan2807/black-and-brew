"use client";

import { useState, useEffect } from 'react';

export const useStore = <T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F
) => {
  const result = store(callback) as F;
  const [data, setData] = useState<F>();

  useEffect(() => {
    // Avoid synchronous setState in effect warning
    const timer = setTimeout(() => setData(result), 0);
    return () => clearTimeout(timer);
  }, [result]);

  return data;
};
