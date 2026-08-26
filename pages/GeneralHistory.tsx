import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { ChevronLeft, ArrowUpRight, ArrowDownRight, TrendingUp, Users, Ticket, History, Gift, Shield, UserPlus } from 'lucide-react';

type HistoryType = 'recargas' | 'retiradas' | 'renda_diaria' | 'bonus_equipe' | 'cupom' | 'tarefas' | 'banimento' | 'convite' | '';

interface HistoryItem {
  id: string;
  type: HistoryType;
  amount: number;
  date: string;
  description: string;
  status: string;
}

const TABS: { label: string; value: HistoryType }[] = [
  { label: 'Ver tudo', value: '' },
  { label: 'Retirada', value: 'retiradas' },
  { label: 'Recarga', value: 'recargas' },
  { label: 'Equipe', value: 'bonus_equipe' },
  { label: 'Tarefas', value: 'tarefas' },
  { label: 'Banimento', value: 'banimento' },
  { label: 'Convite', value: 'convite' },
  { label: 'Resgate de códigos', value: 'cupom' },
];

export default function GeneralHistory() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<HistoryType>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_general_history_mcpn');
        if (error) throw error;
        if (data) {
          const mapped: HistoryItem[] = data.map((item: any) => ({
            id: item.id,
            type: item.type as HistoryType,
            amount: Number(item.amount),
            date: new Date(item.created_at).toLocaleString('pt-AO', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            description: item.description,
            status: item.status,
          }));
          setHistory(mapped);
        }
      } catch {
        showToast('Falha ao carregar histórico', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const filteredData = history.filter(item => !filter || item.type === filter);

  const getIcon = (type: HistoryType) => {
    switch (type) {
      case 'recargas': return <ArrowUpRight size={16} />;
      case 'retiradas': return <ArrowDownRight size={16} />;
      case 'renda_diaria': return <TrendingUp size={16} />;
      case 'bonus_equipe': return <Users size={16} />;
      case 'cupom': return <Ticket size={16} />;
      case 'tarefas': return <Gift size={16} />;
      case 'banimento': return <Shield size={16} />;
      case 'convite': return <UserPlus size={16} />;
      default: return <History size={16} />;
    }
  };

  const getIconBg = (type: HistoryType) => {
    if (type === 'retiradas') return 'bg-red-50 text-[#FE384F]';
    if (type === 'recargas') return 'bg-green-50 text-[#16a34a]';
    if (type === 'renda_diaria') return 'bg-blue-50 text-[#2563eb]';
    if (type === 'bonus_equipe') return 'bg-indigo-50 text-[#4f46e5]';
    if (type === 'cupom') return 'bg-purple-50 text-[#9333ea]';
    if (type === 'tarefas') return 'bg-yellow-50 text-[#d97706]';
    if (type === 'banimento') return 'bg-gray-100 text-[#555555]';
    if (type === 'convite') return 'bg-pink-50 text-[#db2777]';
    return 'bg-gray-100 text-[#444444]';
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'aprovado' || s === 'confirmado' || s === 'completed' || s === 'completo') {
      return 'text-[#16a34a] bg-green-50';
    }
    if (s === 'pendente' || s === 'pending') {
      return 'text-[#d97706] bg-yellow-50';
    }
    if (s === 'rejeitado' || s === 'failed') {
      return 'text-[#FE384F] bg-red-50';
    }
    return 'text-[#555555] bg-gray-100';
  };

  const isCredit = (type: HistoryType) =>
    type !== 'retiradas' && type !== 'banimento';

  return (
    <div className="w-full min-h-screen bg-[#F2F2F2] font-sans antialiased text-[#191919] select-none flex flex-col items-center pb-10">

      <div className="w-full max-w-[480px] bg-white px-4 pt-4 pb-3 sticky top-0 z-30 border-b border-[#F2F2F2]">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate('/perfil')}
            className="p-1 text-[#191919] active:opacity-50 transition-opacity"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <h1 className="text-[15px] font-medium text-[#191919]">Registros</h1>
        </div>

        <div
          className="flex gap-2 overflow-x-auto pb-1 no-scrollbar [&::-webkit-scrollbar]:hidden touch-pan-x select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`flex-shrink-0 h-[32px] px-3.5 text-[12px] font-normal transition-all whitespace-nowrap border ${
                filter === tab.value
                  ? 'bg-[#FE384F] text-white border-[#FE384F]'
                  : 'bg-white text-[#555555] border-[#E8E8E8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="w-full max-w-[480px] px-4 pt-3">
        {loading ? (
          <div className="flex flex-col gap-3 mt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-4 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 bg-gray-200" />
                    <div className="h-3 w-1/2 bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white mt-2 p-12 flex flex-col items-center text-center">
            <History size={36} className="text-[#CCCCCC] mb-3" />
            <p className="text-[13px] text-[#888888] font-normal">Sem registos nesta categoria</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 mt-1">
            {filteredData.map(item => (
              <div key={item.id} className="bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center ${getIconBg(item.type)}`}>
                      {getIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-[#191919] leading-tight truncate">
                        {item.description}
                      </p>
                      <p className="text-[11px] text-[#888888] font-normal mt-0.5">
                        {item.date}
                      </p>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-normal px-2 py-0.5 ${getStatusStyle(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-[#F5F5F5] pt-3">
                  <span className="text-[11.5px] text-[#888888]">
                    {item.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`text-[14px] font-medium ${isCredit(item.type) ? 'text-[#16a34a]' : 'text-[#FE384F]'}`}>
                    {isCredit(item.type) ? '+' : '-'}{item.amount.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                  </span>
                </div>
              </div>
            ))}

            <div className="text-center py-6 text-[11.5px] text-[#AAAAAA]">
              Sem mais registos
            </div>
          </div>
        )}
      </main>
    </div>
  );
}



