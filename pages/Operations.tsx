import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { 
  ChevronLeft, 
  Activity, 
  Loader2
} from 'lucide-react';
import { OperationsPageSkeleton } from '../components/Skeleton';

interface OpsStatusResponse {
  success: boolean;
  estimated_income?: number;
  has_servers?: boolean;
  is_collected_today?: boolean;
  message?: string;
}

export default function Operations() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isOperating, setIsOperating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [estimatedIncome, setEstimatedIncome] = useState(0);
  const [hasServers, setHasServers] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const { data, error } = await supabase.rpc('get_daily_ops_status_mcpn');
        if (error) throw error;
        
        const response = data as unknown as OpsStatusResponse;
        if (response?.success) {
          setEstimatedIncome(Number(response.estimated_income || 0));
          setHasServers(response.has_servers || false);
          
          if (response.is_collected_today) {
            setIsCompleted(true);
            setProgress(100);
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, []);

  const startTask = async () => {
    if (isCompleted || !hasServers) {
      if (!hasServers) showToast('Invista para coletar rendimentos.', 'error');
      return;
    }
    
    setIsOperating(true);
    setProgress(0);

    const duration = 3000;
    const interval = 50;
    const steps = duration / interval;
    const increment = 100 / steps;
    
    let currentProgress = 0;
    const timer = setInterval(async () => {
      currentProgress += increment;
      if (currentProgress >= 100) {
        setProgress(100);
        clearInterval(timer);
        
        try {
          const { data, error } = await supabase.rpc('collect_daily_earnings');
          if (error) throw error;
          
          const response = data as unknown as OpsStatusResponse;
          if (response?.success) {
            setIsCompleted(true);
            setIsOperating(false);
            showToast(response.message || 'Ganhos coletados!', 'success');
          } else {
            setIsOperating(false);
            setProgress(0);
            showToast(response?.message || 'Coleta excedida', 'error');
          }
        } catch (err: any) {
          setIsOperating(false);
          setProgress(0);
          showToast(err.message || 'Falha, recarregue a pagina.', 'error');
        }
      } else {
        setProgress(Math.floor(currentProgress));
      }
    }, interval);
  };

  if (loading) {
    return <OperationsPageSkeleton />;
  }

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
            Iniciar Operações
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[480px] px-4 pt-4 space-y-4">
        <div className="bg-white rounded-none p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FE384F]" />
              <span className="text-[13px] font-medium text-[#202020]">{t('ops.system_status')}</span>
            </div>
            <div className={cn(
              "px-2 py-0.5 rounded-none text-[10.5px] font-normal",
              isOperating ? "bg-red-50 text-[#FE384F]" : 
              isCompleted ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-[#888888]"
            )}>
              {isOperating ? t('ops.processing') : isCompleted ? t('ops.completed') : t('ops.waiting')}
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-[3px] bg-gray-100 rounded-none overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={cn(
                  "h-full transition-all duration-300 ease-out",
                  isCompleted ? "bg-emerald-500" : "bg-[#FE384F]"
                )}
              />
            </div>
            <div className="flex justify-between items-center text-[11.5px] text-[#888888]">
              <span>
                {isOperating ? t('ops.synchronized') : (isCompleted ? "Sincronização finalizada" : "Aguardando início")}
              </span>
              <span className="font-medium text-[#202020]">{progress}%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center py-4">
          <button 
            onClick={startTask}
            disabled={isCompleted || loading}
            className={cn(
              "w-28 h-28 rounded-none flex flex-col items-center justify-center space-y-2 transition-all active:scale-[0.97] cursor-pointer shadow-sm",
              isCompleted 
                ? "bg-emerald-600 text-white cursor-default" 
                : "bg-[#FE384F] hover:bg-[#E02E44] text-white"
            )}
          >
            <AnimatePresence mode="wait">
              {isOperating ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="w-8 h-8 animate-spin" />
                </motion.div>
              ) : (
                <motion.div key="icon" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center space-y-1.5">
                  <div className="w-10 h-10 bg-white rounded-none flex items-center justify-center p-1">
                    <img src="/icone_power_exe.tarefas.png" alt="tarefa" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[13px] font-normal">
                    {isCompleted ? "Concluído" : "Iniciar"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-none p-3.5 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <p className="text-[11.5px] text-[#888888] mb-0.5 font-normal">Concluídas</p>
            <p className="text-[15px] font-medium text-[#202020]">
              {isCompleted ? "1" : "0"}
            </p>
          </div>
          <div className="bg-white rounded-none p-3.5 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <p className="text-[11.5px] text-[#888888] mb-0.5 font-normal">Não Concluídas</p>
            <p className="text-[15px] font-medium text-[#202020]">
              {isCompleted ? "0" : (hasServers ? "1" : "0")}
            </p>
          </div>
        </div>
        
        {!isCompleted && estimatedIncome > 0 && (
          <div className="text-center pt-1">
            <p className="text-[12px] text-[#777777] font-normal">
              Rendimento estimado: <span className="text-[#202020] font-medium">{estimatedIncome.toLocaleString('pt-BR')},00 Kz</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
