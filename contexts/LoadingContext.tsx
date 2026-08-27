import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const activeCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = () => {
    activeCountRef.current += 1;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(true);
  };

  const stopLoading = () => {
    activeCountRef.current = Math.max(0, activeCountRef.current - 1);
    if (activeCountRef.current === 0) {
      // Delay transition to false to prevent flicker/flashes
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        timeoutRef.current = null;
      }, 300); // 300ms delay for a smooth transition
    }
  };

  useEffect(() => {
    const handleStart = () => startLoading();
    const handleEnd = () => stopLoading();

    window.addEventListener('app:loading-start', handleStart);
    window.addEventListener('app:loading-end', handleEnd);

    return () => {
      window.removeEventListener('app:loading-start', handleStart);
      window.removeEventListener('app:loading-end', handleEnd);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider');
  }
  return context;
};
