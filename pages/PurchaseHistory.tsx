import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';
import { SmartImage } from '../components/SmartImage';
import { History, ChevronLeft } from 'lucide-react';

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPurchases() {
      try {
        const { data, error } = await supabase.rpc('get_my_purchased_products_mcpn');
        if (error) throw error;
        if (data) setPurchases(data);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : 'pt-AO'
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#F2F2F2] pb-24 font-sans antialiased text-[#202020] select-none flex flex-col items-center">
      <header className="w-full max-w-[480px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/perfil')} 
            className="p-1 -ml-1 text-[#202020] active:scale-95 transition-transform"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="w-5 h-5 stroke-[1.8]" />
          </button>
          <h1 className="text-[14.5px] font-medium text-[#202020] tracking-normal">
            {t('history.title')}
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[480px] px-4 pt-4 flex-1 space-y-3">
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-normal text-[12px]">
            Sincronizando bots ativos...
          </div>
        ) : purchases.length === 0 ? (
          <div className="bg-white rounded-none p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col items-center space-y-2">
             <History size={36} className="text-gray-300" />
             <p className="text-[12.5px] text-[#888888] font-normal">
               Nenhum bot ativo no momento
             </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {purchases.map((item) => {
                const dailyIncome = item.renda_diaria;
                return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white rounded-none p-4 flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3"
                  >
                    <div className="flex gap-3 items-start">
                      <div className="w-[60px] h-[60px] shrink-0 bg-[#FAFAFA] rounded-none flex items-center justify-center overflow-hidden">
                        <SmartImage 
                          src={item.produto_imagem} 
                          className="w-full h-full object-cover" 
                          style={{ background: 'transparent' }}
                          alt={item.produto_nome}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[13.5px] font-medium text-[#202020] truncate" title={item.produto_nome}>
                              {item.produto_nome}
                            </h3>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-none text-[10px] font-normal shrink-0",
                              item.ativo 
                                ? "text-emerald-600 bg-emerald-50" 
                                : "text-[#FE384F] bg-red-50"
                            )}>
                              {item.ativo ? t('history.status_active') : t('history.status_expired')}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-[#AAAAAA] font-normal">
                            ID: {item.id.toString().substring(0, 8).toUpperCase()}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100 text-[11.5px]">
                          <div>
                            <span className="text-[#888888] block text-[10px]">Ativação</span>
                            <span className="font-medium text-[#202020]">
                              {Number(item.preco_pago).toLocaleString(undefined, { minimumFractionDigits: 2 })} Kz
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[#888888] block text-[10px]">Recompensa Diária</span>
                            <span className="font-medium text-[#25D366]">
                              +{Number(dailyIncome).toLocaleString(undefined, { minimumFractionDigits: 2 })} Kz
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 py-2 border-t border-gray-100 text-[11px] text-[#777777]">
                      <div className="flex justify-between items-center">
                        <span>Data de ativação:</span>
                        <span className="font-normal text-[#202020]">{formatDate(item.data_inicio)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Data de expiração:</span>
                        <span className="font-normal text-[#202020]">{formatDate(item.data_fim)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Capacidade:</span>
                        <span className="font-normal text-[#202020]">{item.storage_size || '---'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-[10px] text-[#AAAAAA] font-normal">
                        BOT ATIVO
                      </span>
                      
                      <button 
                        onClick={() => {
                          if (item.url_download_setup) {
                            window.open(item.url_download_setup, '_blank');
                          } else {
                            showToast('Download indisponível', 'error');
                          }
                        }}
                        className="h-7 px-4 rounded-none bg-[#3390ec] hover:bg-[#287dc9] text-white text-[11px] font-normal transition-all active:scale-95 cursor-pointer"
                      >
                        Acessar
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
