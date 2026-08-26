import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, AlertTriangle, RefreshCw, X } from 'lucide-react';

export const ConnectivityOverlay: React.FC = () => {
  const [errorType, setErrorType] = useState<'offline' | 'timeout' | null>(null);

  useEffect(() => {
    const handleOffline = () => setErrorType('offline');
    const handleTimeout = () => setErrorType('timeout');
    const handleOnline = () => {
      if (errorType === 'offline') setErrorType(null);
    };

    window.addEventListener('app:offline', handleOffline);
    window.addEventListener('app:timeout', handleTimeout);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('app:offline', handleOffline);
      window.removeEventListener('app:timeout', handleTimeout);
      window.removeEventListener('online', handleOnline);
    };
  }, [errorType]);

  const handleRetry = () => {
    setErrorType(null);
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {errorType && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[10001] p-3 flex justify-center pointer-events-none"
        >
          <div className="bg-white border border-[#E8E8E8] shadow-[0_4px_12px_rgba(0,0,0,0.08)] rounded-none p-3.5 flex items-center gap-3 pointer-events-auto w-full max-w-[480px]">
            <div className="w-8 h-8 rounded-none bg-[#F5F5F5] flex items-center justify-center shrink-0">
              {errorType === 'offline' ? (
                <WifiOff className="w-4 h-4 text-[#FE384F]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#FE384F]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#202020] leading-tight">
                {errorType === 'offline' ? 'Sem Ligação à Internet' : 'Tempo Limite Excedido'}
              </p>
              <p className="text-[11.5px] text-[#777777] font-normal leading-snug mt-0.5">
                {errorType === 'offline'
                  ? 'Por favor verifique a sua ligação à rede.'
                  : 'O servidor demorou mais de 20s a responder.'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[#F0F0F0]">
              <button
                onClick={handleRetry}
                className="w-7 h-7 rounded-none bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EAEAEA] active:scale-95 transition-all text-[#202020] cursor-pointer"
                title="Tentar novamente"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setErrorType(null)}
                className="w-7 h-7 rounded-none bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EAEAEA] active:scale-95 transition-all text-[#777777] cursor-pointer"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
