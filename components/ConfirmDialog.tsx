import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit?: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  editText?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  confirmText = 'Delete',
  cancelText = 'Close',
  editText = 'Edit',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center p-2.5 bg-black/40 backdrop-blur-xs select-none"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="w-full max-w-[480px] flex flex-col gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Container */}
            <div className="bg-white rounded-none overflow-hidden shadow-md divide-y divide-gray-100 border border-gray-100">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="w-full h-[46px] rounded-none text-[15px] font-normal text-[#007AFF] hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer"
                >
                  {editText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="w-full h-[46px] rounded-none text-[15px] font-normal text-[#FE384F] hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center cursor-pointer"
              >
                {confirmText || 'Delete'}
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full h-[46px] bg-white rounded-none text-[15px] font-medium text-[#007AFF] hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center shadow-md border border-gray-100 cursor-pointer"
            >
              {cancelText || 'Close'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

