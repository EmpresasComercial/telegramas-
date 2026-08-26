import React from 'react';
// default icon uses image asset

import { motion } from 'motion/react';

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, description, icon }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center w-full"
    >
      <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
        {icon || <img src="/img_data_3x.png" className="w-12 h-12 object-contain opacity-20" alt="empty" />}
      </div>
      <h3 className="text-gray-900 font-bold text-base mb-2 tracking-tight">{message}</h3>
      {description && (
        <p className="text-gray-400 text-xs max-w-[200px] mx-auto leading-relaxed font-medium">
          {description}
        </p>
      )}
    </motion.div>
  );
}
