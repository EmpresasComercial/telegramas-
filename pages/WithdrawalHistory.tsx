import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';
import { ArrowDownRight, ArrowUpRight, History, Clock, ChevronLeft } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

export default function WithdrawalHistory() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'recarga' | 'retirada'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'recarga' || tabParam === 'retirada') return tabParam;
    return window.location.pathname.includes('registro-recarga') ? 'recarga' : 'retirada';
  });

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoading(true);
        
        const { data: withdrawData, error: withdrawError } = await supabase.rpc('get_my_withdrawals_mcpn');
        if (withdrawError) throw withdrawError;
        if (withdrawData) setWithdrawals(withdrawData);
        
        const { data: rechargeData, error: rechargeError } = await supabase
          .from('recargas_mcpn')
          .select('*');
        if (rechargeError) throw rechargeError;

        const { data: usdtData, error: usdtError } = await supabase
          .from('recharges_usdt_mcpn')
          .select('*');
        if (usdtError) throw usdtError;

        const unifiedRecharges = [
          ...(rechargeData || []).map((item: any) => ({ ...item, isUsdt: false })),
          ...(usdtData || []).map((item: any) => ({ ...item, isUsdt: true }))
        ];
        
        unifiedRecharges.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecharges(unifiedRecharges);
        
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);

  const formatFullDateWithSeconds = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleString('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getApprovalDate = (createdAtStr: string) => {
    const date = new Date(createdAtStr);
    date.setHours(date.getHours() + 1);
    date.setMinutes(date.getMinutes() + 15);
    return formatFullDateWithSeconds(date);
  };

  const getWithdrawStatusStyle = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'text-[#e1a32a] bg-amber-50';
      case 'aprovado':
        return 'text-[#16a34a] bg-emerald-50';
      default:
        return 'text-[#FE384F] bg-red-50';
    }
  };

  const getRechargeStatusStyle = (status: string) => {
    switch (status) {
      case 'completo':
        return 'text-[#16a34a] bg-emerald-50';
      case 'rejeitado':
        return 'text-[#FE384F] bg-red-50';
      case 'recarregando':
      default:
        return 'text-[#2563eb] bg-blue-50';
    }
  };

  const currentList = activeTab === 'recarga' ? recharges : withdrawals;

  return (
    <div className="w-full min-h-screen bg-[#F2F2F2] pb-24 font-sans antialiased text-[#202020] select-none flex flex-col items-center">
      <header className="w-full max-w-[480px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/perfil')} 
            className="p-1 -ml-1 text-[#202020] active:scale-95 transition-transform"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5 stroke-[1.8]" />
          </button>
          <h1 className="text-[14.5px] font-medium text-[#202020] tracking-normal">
            {t('history.general_title')}
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[480px] px-4 pt-4 space-y-3">
        <div className="flex w-full bg-white p-1 rounded-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <button
            onClick={() => setActiveTab('recarga')}
            className={cn(
              "flex-1 py-2 text-[13px] font-normal transition-all text-center rounded-none cursor-pointer",
              activeTab === 'recarga' 
                ? "bg-[#FE384F] text-white" 
                : "text-[#666666] hover:text-[#202020]"
            )}
          >
            {t('history.filter_recharge')}
          </button>
          <button
            onClick={() => setActiveTab('retirada')}
            className={cn(
              "flex-1 py-2 text-[13px] font-normal transition-all text-center rounded-none cursor-pointer",
              activeTab === 'retirada' 
                ? "bg-[#FE384F] text-white" 
                : "text-[#666666] hover:text-[#202020]"
            )}
          >
            {t('history.filter_withdraw')}
          </button>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-none p-3.5 space-y-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="flex justify-between items-center">
                  <Skeleton className="w-24 h-3.5 rounded-none" />
                  <Skeleton className="w-16 h-3.5 rounded-none" />
                </div>
                <Skeleton className="w-full h-8 rounded-none" />
              </div>
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="bg-white rounded-none p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col items-center">
             <History size={36} className="text-gray-300 mb-2" />
             <p className="text-[12.5px] text-gray-400 font-normal">
               {activeTab === 'recarga' ? t('history.empty_recharge') : t('history.empty_withdraw')}
             </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {currentList.map((item) => {
                if (activeTab === 'recarga') {
                  return (
                    <motion.div
                      key={`recharge-${item.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="bg-white rounded-none p-3.5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-7 h-7 rounded-none flex items-center justify-center",
                            item.isUsdt 
                              ? "bg-blue-50 text-blue-600"
                              : "bg-red-50 text-[#FE384F]"
                          )}>
                            <ArrowUpRight size={16} />
                          </div>
                          <div>
                            <p className="text-[13.5px] font-medium text-[#202020] leading-tight">
                              {item.isUsdt ? 'Recarga USDT' : 'Recarga Bancária'}
                            </p>
                            <p className="text-[10.5px] text-[#AAAAAA] font-normal mt-0.5">
                              {formatFullDateWithSeconds(item.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "px-2 py-0.5 rounded-none text-[10px] font-normal",
                          getRechargeStatusStyle(item.status)
                        )}>
                          {item.status}
                        </div>
                      </div>

                      <div className="space-y-1.5 py-2 border-y border-gray-100 text-[12px]">
                        <div className="flex justify-between items-center">
                          <span className="text-[#888888] font-normal">{t('history.recharge_amount')}</span>
                          <span className="font-medium text-[#202020]">
                            {item.isUsdt 
                              ? `+${Number(item.valor_usdt).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT`
                              : `+${Number(item.valor).toLocaleString(undefined, { minimumFractionDigits: 2 })} Kz`
                            }
                          </span>
                        </div>
                        {!item.isUsdt && (
                          <div className="flex justify-between items-center">
                            <span className="text-[#888888] font-normal">{t('history.origin_bank')}</span>
                            <span className="font-normal text-[#202020]">
                              {item.banco_origem || 'Depósito Bancário'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#AAAAAA] font-normal">
                        <span className="flex items-center">
                          <Clock size={11} className="mr-1 text-[#AAAAAA]" />
                          {t('history.validation_time')}
                        </span>
                        <span className="truncate max-w-[150px]">ID: {item.id.toString().toUpperCase()}</span>
                      </div>
                    </motion.div>
                  );
                } else {
                  return (
                    <motion.div
                      key={`withdraw-${item.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="bg-white rounded-none p-3.5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-red-50 text-[#FE384F] rounded-none flex items-center justify-center">
                            <ArrowDownRight size={16} />
                          </div>
                          <div>
                            <p className="text-[13.5px] font-medium text-[#202020] leading-tight">
                              {(item.banco_destino || 'Banco').split(' - ')[0]}
                            </p>
                            <p className="text-[10.5px] text-[#AAAAAA] font-normal mt-0.5">
                              {formatFullDateWithSeconds(item.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "px-2 py-0.5 rounded-none text-[10px] font-normal",
                          getWithdrawStatusStyle(item.status)
                        )}>
                          {item.status}
                        </div>
                      </div>

                      <div className="space-y-1.5 py-2 border-y border-gray-100 text-[12px]">
                        <div className="flex justify-between items-center">
                          <span className="text-[#888888] font-normal">{t('history.net_value')}</span>
                          <span className="font-medium text-[#FE384F]">
                            {Number(item.valor_liquido).toLocaleString(undefined, { minimumFractionDigits: 2 })} Kz
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#888888] font-normal">{t('history.tax_applied')}</span>
                          <span className="font-normal text-[#555555]">
                            {Number(item.taxa_14).toLocaleString(undefined, { minimumFractionDigits: 2 })} Kz
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#888888] font-normal">{t('history.dest_iban')}</span>
                          <span className="font-normal text-[#202020] tracking-tight">
                            {item.iban_snapshot || t('common.not_informed')}
                          </span>
                        </div>
                        {item.status === 'aprovado' && (
                          <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-100">
                            <span className="text-[#888888] font-normal">{t('history.approval_date')}</span>
                            <span className="font-medium text-[#16a34a]">
                              {getApprovalDate(item.created_at)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#AAAAAA] font-normal">
                        <span>{t('history.beneficiary')}: {item.nome_beneficiario || 'N/A'}</span>
                        <span className="truncate max-w-[150px]">ID: {item.id.toString().toUpperCase()}</span>
                      </div>
                    </motion.div>
                  );
                }
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
