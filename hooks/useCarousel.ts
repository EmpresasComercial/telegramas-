import { useState, useEffect, useCallback } from 'react';

interface UseCarouselOptions {
  itemsCount: number;
  interval?: number;
}

export function useCarousel({ itemsCount, interval = 5000 }: UseCarouselOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % itemsCount);
  }, [itemsCount]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + itemsCount) % itemsCount);
  }, [itemsCount]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  useEffect(() => {
    if (!interval) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [next, interval]);

  return { currentIndex, next, prev, goTo };
}
