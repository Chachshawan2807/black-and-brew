'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CopyFeedbackStatus = 'idle' | 'copied' | 'error';

export function useBeanOrderCopyFeedback() {
  const [status, setStatus] = useState<CopyFeedbackStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showStatus = useCallback((nextStatus: Exclude<CopyFeedbackStatus, 'idle'>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus(nextStatus);
    timeoutRef.current = setTimeout(() => {
      setStatus('idle');
      timeoutRef.current = null;
    }, 3000);
  }, []);

  const showCopied = useCallback(() => showStatus('copied'), [showStatus]);
  const showError = useCallback(() => showStatus('error'), [showStatus]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { status, showCopied, showError };
}
