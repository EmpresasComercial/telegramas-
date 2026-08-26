import { useState, useEffect, useCallback } from 'react';

interface UsePopupOptions {
  initialDelay?: number;
  autoCloseTime?: number;
}

export function usePopup({ initialDelay = 800, autoCloseTime = 15000 }: UsePopupOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const timer = setTimeout(open, initialDelay);
    return () => clearTimeout(timer);
  }, [open, initialDelay]);

  useEffect(() => {
    if (!isOpen || !autoCloseTime) return;
    const timer = setTimeout(close, autoCloseTime);
    return () => clearTimeout(timer);
  }, [isOpen, close, autoCloseTime]);

  return { isOpen, open, close };
}
