import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Star, Sparkles, RefreshCw, ShoppingBag, 
  ArrowRightLeft, Check, ShieldCheck, Zap, Loader2, Gift, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../lib/currency';

interface StarPackage {
  id: string;
  stars: number;
  priceKz: number;
  badge?: string;
  badgeColor?: string;
  discount?: string;
}

const STAR_PACKAGES: StarPackage[] = [
  { id: 'pkg-50', stars: 50, priceKz: 1500 },
  { id: 'pkg-100', stars: 100, priceKz: 3000, badge: 'Mais Popular', badgeColor: 'bg-[#f59e0b]' },
  { id: 'pkg-500', stars: 500, priceKz: 14500, discount: '-3%' },
  { id: 'pkg-1000', stars: 1000, priceKz: 28000, badge: 'Melhor Valor', badgeColor: 'bg-[#8b5cf6]', discount: '-6.5%' },
  { id: 'pkg-5000', stars: 5000, priceKz: 135000, badge: 'Pacote VIP', badgeColor: 'bg-[#ec4899]', discount: '-10%' },
];

export default function TelegramStars() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [starsBalance, setStarsBalance] = useState<number>(() => {
    const cached = localStorage.getItem('user_stars_balance');
    return cached ? parseInt(cached, 10) : 150;
  });
  
  const [kzBalance, setKzBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'buy' | 'convert' | 'history'>('buy');
  const [purchasingPkg, setPurchasingPkg] = useState<string | null>(null);
  const [convertAmount, setConvertAmount] = useState<string>('50');
  const [isConverting, setIsConverting] = useState(false);
  const [loading, setLoading] = useState(true);

  // History log
  const [history, setHistory] = useState<Array<{ id: string; title: string; date: string; amount: string; positive: boolean }>>(() => {
    const cached = localStorage.getItem('user_stars_history');
    return cached ? JSON.parse(cached) : [
      { id: '1', title: 'Bônus de Boas-Vindas Telegram Stars', date: 'Hoje', amount: '+150 Stars', positive: true },
    ];
  });

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_my_account_data');
      if (!error && data && data.length > 0) {
        const d = data[0] as any;
        if (d.saldo_disponivel !== undefined) setKzBalance(Number(d.saldo_disponivel));
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const updateStarsBalance = (newBalance: number) => {
    setStarsBalance(newBalance);
    localStorage.setItem('user_stars_balance', newBalance.toString());
  };

  const addHistoryItem = (title: string, amount: string, positive: boolean) => {
    const newItem = {
      id: Date.now().toString(),
      title,
      date: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      amount,
      positive,
    };
    const updated = [newItem, ...history];
    setHistory(updated);
    localStorage.setItem('user_stars_history', JSON.stringify(updated));
  };

  // Buy Star Package
  const handleBuyPackage = async (pkg: StarPackage) => {
    if (kzBalance < pkg.priceKz) {
      showToast('Saldo em Kz insuficiente. Recarregue para comprar Stars.', 'error');
      navigate('/recarregar');
      return;
    }

    setPurchasingPkg(pkg.id);
    try {
      // Simulate RPC deduction / API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newKz = kzBalance - pkg.priceKz;
      const newStars = starsBalance + pkg.stars;

      setKzBalance(newKz);
      updateStarsBalance(newStars);
      addHistoryItem(`Compra de ${pkg.stars} Telegram Stars`, `+${pkg.stars} Stars`, true);

      showToast(`Adquirido ${pkg.stars} Estrelas com sucesso!`, 'success');
    } catch (err: any) {
      showToast('Erro ao processar compra de Estrelas', 'error');
    } finally {
      setPurchasingPkg(null);
    }
  };

  // Convert Stars to Kz (1 Star = 30 Kz)
  const handleConvertStars = async () => {
    const numStars = parseInt(convertAmount, 10);
    if (isNaN(numStars) || numStars <= 0) {
      showToast('Insira uma quantidade válida de Estrelas.', 'error');
      return;
    }

    if (starsBalance < numStars) {
      showToast('Saldo de Estrelas insuficiente.', 'error');
      return;
    }

    setIsConverting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const convertedKz = numStars * 30; // Rate: 1 Star = 30 Kz
      const newStars = starsBalance - numStars;
      const newKz = kzBalance + convertedKz;

      updateStarsBalance(newStars);
      setKzBalance(newKz);
      addHistoryItem(`Conversão de ${numStars} Stars para Kz`, `-${numStars} Stars`, false);

      showToast(`Convertido ${numStars} Stars em ${formatCurrency(convertedKz, 'KZ')}!`, 'success');
      setConvertAmount('');
    } catch {
      showToast('Erro ao converter Estrelas.', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0f1015] text-white font-sans pb-20 select-none">
      
      {/* ── HEADER ── */}
      <header className="w-full px-4 pt-4 pb-3 sticky top-0 z-30 bg-[#0f1015]/90 backdrop-blur-md flex items-center justify-between border-b border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1 text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer rounded-full bg-white/5"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#f59e0b] fill-[#f59e0b] animate-bounce" />
          <span className="text-[16px] font-bold tracking-tight bg-gradient-to-r from-[#fef08a] via-[#f59e0b] to-[#d97706] bg-clip-text text-transparent">
            Telegram Stars
          </span>
        </div>
        <div className="w-8" />
      </header>

      <main className="max-w-[540px] mx-auto px-4 pt-4 flex flex-col gap-5">
        
        {/* ── HERO BANNER: SALDO DE ESTRELAS ── */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-[#b45309]/30 via-[#78350f]/20 to-[#12131c] border border-amber-500/20 p-6 text-center shadow-[0_8px_32px_rgba(245,158,11,0.15)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl -ml-10 -mb-10" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Ícone 3D Grande */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#f59e0b] via-[#fbbf24] to-[#fef08a] p-[3px] shadow-[0_0_25px_rgba(245,158,11,0.5)] mb-3">
              <div className="w-full h-full rounded-full bg-[#0f1015] flex items-center justify-center overflow-hidden">
                <img
                  src="/tg_stars_gold.jpg"
                  alt="Telegram Stars"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
                <Star className="w-10 h-10 text-[#f59e0b] fill-[#f59e0b]" />
              </div>
            </div>

            <span className="text-[12px] font-semibold text-amber-200/80 uppercase tracking-wider mb-1">
              Seu Saldo Oficial de Estrelas
            </span>

            <div className="text-[32px] font-black tracking-tight text-white flex items-center justify-center gap-2 mb-1">
              <span>{starsBalance.toLocaleString()}</span>
              <span className="text-[20px] text-[#f59e0b] font-bold">Stars</span>
            </div>

            <div className="flex items-center gap-2 text-[12px] text-gray-400 bg-white/[0.05] px-3 py-1.5 rounded-full border border-white/10 mt-1">
              <span>Saldo em Conta: <strong>{formatCurrency(kzBalance, 'KZ')}</strong></span>
            </div>
          </div>
        </div>

        {/* ── ABAS DE NAVEGAÇÃO INTERNA ── */}
        <div className="flex bg-[#171923] p-1 rounded-full border border-white/5">
          <button
            onClick={() => setActiveTab('buy')}
            className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'buy'
                ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            Comprar Estrelas
          </button>

          <button
            onClick={() => setActiveTab('convert')}
            className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'convert'
                ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Converter em Kz
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Histórico
          </button>
        </div>

        {/* ── ABA 1: PACOTES DE COMPRA DE ESTRELAS ── */}
        {activeTab === 'buy' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[15px] font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Pacotes Oficiais Telegram Stars
              </h2>
              <span className="text-[12px] text-amber-300 font-medium">1 Star ≈ 30 Kz</span>
            </div>

            <div className="flex flex-col gap-3">
              {STAR_PACKAGES.map((pkg) => {
                const isLoadingThis = purchasingPkg === pkg.id;
                return (
                  <motion.div
                    key={pkg.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="bg-[#171923] rounded-[20px] p-4 border border-white/5 flex items-center justify-between relative overflow-hidden"
                  >
                    {/* Badge */}
                    {pkg.badge && (
                      <span className={`absolute top-0 right-0 px-3 py-0.5 rounded-bl-[12px] text-[10px] font-bold text-white ${pkg.badgeColor}`}>
                        {pkg.badge}
                      </span>
                    )}

                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Star className="w-6 h-6 text-[#f59e0b] fill-[#f59e0b]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[17px] font-black text-white">{pkg.stars} Estrelas</h3>
                          {pkg.discount && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {pkg.discount}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-gray-400 font-medium mt-0.5">
                          {formatCurrency(pkg.priceKz, 'KZ')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyPackage(pkg)}
                      disabled={isLoadingThis}
                      className="px-4 py-2.5 rounded-[14px] bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white text-[13.5px] font-bold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Adquirir'
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ABA 2: CONVERTER ESTRELAS EM KZ ── */}
        {activeTab === 'convert' && (
          <div className="bg-[#171923] rounded-[24px] p-5 border border-white/5 space-y-4">
            <div>
              <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                Converter Estrelas para Saldo em Kz
              </h2>
              <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">
                Troque as suas Telegram Stars acumuladas diretamente por saldo em Kz disponível para retirada imediata.
              </p>
            </div>

            <div className="bg-white/[0.03] p-4 rounded-[18px] border border-white/5 space-y-3">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-400">Taxa de Conversão:</span>
                <span className="font-bold text-amber-400">1 Star = 30,00 Kz</span>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] text-gray-300 font-semibold">Quantidade de Estrelas:</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max={starsBalance}
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    placeholder="Ex: 50"
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-[14px] px-4 text-[16px] font-bold text-white outline-none focus:border-amber-500 transition-all pr-16"
                  />
                  <button
                    onClick={() => setConvertAmount(starsBalance.toString())}
                    className="absolute right-3 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md hover:bg-amber-500/20"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Resultado em Kz */}
              {parseInt(convertAmount, 10) > 0 && (
                <div className="p-3 bg-amber-500/10 rounded-[14px] border border-amber-500/20 flex items-center justify-between">
                  <span className="text-[13px] text-amber-200">Você receberá no saldo:</span>
                  <span className="text-[17px] font-black text-amber-400">
                    +{formatCurrency((parseInt(convertAmount, 10) || 0) * 30, 'KZ')}
                  </span>
                </div>
              )}

              <button
                onClick={handleConvertStars}
                disabled={isConverting || !convertAmount || parseInt(convertAmount, 10) <= 0}
                className="w-full h-12 rounded-[14px] bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white font-bold text-[15px] shadow-lg hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isConverting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Confirmar Conversão'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── ABA 3: HISTÓRICO DE ESTRELAS ── */}
        {activeTab === 'history' && (
          <div className="bg-[#171923] rounded-[24px] p-5 border border-white/5 space-y-4">
            <h2 className="text-[16px] font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              Histórico de Movimentações
            </h2>

            {history.length === 0 ? (
              <p className="text-gray-400 text-[13px] text-center py-6">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-[14px] bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${item.positive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <h4 className="text-[13.5px] font-semibold text-white">{item.title}</h4>
                        <span className="text-[11px] text-gray-400">{item.date}</span>
                      </div>
                    </div>
                    <span className={`text-[14px] font-bold ${item.positive ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {item.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── UTILIDADE DAS ESTRELAS ── */}
        <div className="bg-[#171923] rounded-[20px] p-5 border border-white/5">
          <h2 className="text-[15px] font-bold text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            Para que servem as Telegram Stars?
          </h2>
          <div className="grid grid-cols-1 gap-2.5 text-[12.5px] text-gray-300">
            <div className="flex items-start gap-2.5 p-2.5 rounded-[12px] bg-white/[0.02]">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>Ativação Instantânea de Bots:</strong> Utilize Estrelas para ativar Bots na plataforma com desconto especial.</span>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-[12px] bg-white/[0.02]">
              <Gift className="w-4 h-4 text-[#ec4899] shrink-0 mt-0.5" />
              <span><strong>Enviar Presentes:</strong> Transfira presentes e recompensas de estrelas para os membros da sua equipe.</span>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-[12px] bg-white/[0.02]">
              <ShieldCheck className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5" />
              <span><strong>Conversão em Dinheiro Real:</strong> Troque suas Estrelas por Kz a qualquer momento para sacar via IBAN.</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
