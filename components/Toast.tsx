import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title?: string;
  type?: ToastType;
}

interface ToastContextType {
  showToast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void;
}

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function cleanToastMessage(msg: string): string {
  if (!msg) return '';
  return msg
    .replace(/SEGURANÇA\s+Telegram Business\b[:\s]*/gi, '')
    .replace(/\bMICROSOFT\b[:\s]*/gi, '')
    .trim();
}

function isErrorMessage(msg: string): boolean {
  const lower = (msg || '').toLowerCase();
  return /bloquead|falh|erro|insuficiente|recusad|negad|inv[aá]lid|incorret|proibid|n[aã]o autorizado|expirad/.test(lower);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, typeOrOptions?: ToastType | ToastOptions) => {
      let type: ToastType = 'info';

      if (typeof typeOrOptions === 'string') {
        type = typeOrOptions;
      } else if (typeOrOptions) {
        type = typeOrOptions.type ?? 'info';
      }

      if (isErrorMessage(message) && type !== 'warning') {
        type = 'error';
      }

      setToast({
        id: Date.now(),
        message: cleanToastMessage(message),
        type,
      });
    },
    []
  );

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500); // Auto dismiss after 3.5 seconds like Telegram
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
            className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[9999] pointer-events-none px-4 w-full flex justify-center"
          >
            <div 
              className="bg-[#1c1c1d]/90 backdrop-blur-md rounded-[18px] px-4 py-2.5 max-w-[320px] shadow-sm text-center"
            >
              <p className="font-sans font-medium text-[15px] text-white leading-tight">
                {toast.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
