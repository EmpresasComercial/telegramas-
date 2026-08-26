import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { formatCurrency } from '../../../lib/currency';
import { Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface StatsGridProps {
  totalUsdt: number;
  totalRecarregado: number;
  totalRetirado: number;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ totalUsdt, totalRecarregado, totalRetirado }) => {
  const { t } = useLanguage();

  const stats = [
    {
      label: 'Saldo USDT',
      value: formatCurrency(totalUsdt, 'USDT'),
      icon: <Wallet size={16} className="text-blue-600 mb-1.5" />,
    },
    {
      label: 'Recarregado',
      value: formatCurrency(totalRecarregado, 'KZ'),
      icon: <ArrowUpCircle size={16} className="text-[#C62828] mb-1.5" />,
    },
    {
      label: 'Retirada',
      value: formatCurrency(totalRetirado, 'KZ'),
      icon: <ArrowDownCircle size={16} className="text-red-600 mb-1.5" />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-1 px-1 -mt-10 mb-8 relative z-20">
      {stats.map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="ms-flat-card py-3 px-1 flex flex-col items-center text-center shadow-none border border-gray-100"
        >
          {stat.icon}
          <span className="text-[10px] font-bold text-gray-900 leading-tight">{stat.value}</span>
          <span className="text-[8px] text-gray-400 font-bold mt-0.5 tracking-tighter">{stat.label}</span>
        </motion.div>
      ))}
    </div>
  );
};
