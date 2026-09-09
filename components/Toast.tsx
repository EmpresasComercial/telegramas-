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
      }, 2500); // Mais leve e ágil
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
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] pointer-events-none p-4 flex items-center justify-center"
          >
            <div 
              className="bg-black/75 backdrop-blur-md text-white rounded-full px-4.5 py-2 max-w-[85vw] text-center shadow-none select-none"
            >
              <p 
                className="font-normal text-[14.5px] text-white/95 leading-snug tracking-wide"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
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
