import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ChevronRight, Users, Sparkles, X, 
  Check, Loader2, ArrowRightLeft, ShoppingBag, Info
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
  { id: 'pkg-100', stars: 100, priceKz: 3000, badge: 'Popular', badgeColor: 'bg-[#f59e0b]' },
  { id: 'pkg-500', stars: 500, priceKz: 14500, discount: '-3%' },
  { id: 'pkg-1000', stars: 1000, priceKz: 28000, badge: 'Melhor Valor', badgeColor: 'bg-[#8b5cf6]', discount: '-6.5%' },
  { id: 'pkg-5000', stars: 5000, priceKz: 135000, badge: 'Pacote VIP', badgeColor: 'bg-[#ec4899]', discount: '-10%' },
];

export default function TelegramStars() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [starsBalance, setStarsBalance] = useState<number>(() => {
    const cached = localStorage.getItem('user_stars_balance');
    return cached ? parseInt(cached, 10) : 0;
  });

  const [kzBalance, setKzBalance] = useState<number>(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [purchasingPkg, setPurchasingPkg] = useState<string | null>(null);
  const [convertAmount, setConvertAmount] = useState<string>('50');
  const [isConverting, setIsConverting] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_account_data');
      if (!error && data && data.length > 0) {
        const d = data[0] as any;
        if (d.saldo_disponivel !== undefined) setKzBalance(Number(d.saldo_disponivel));
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const updateStarsBalance = (newBalance: number) => {
    setStarsBalance(newBalance);
    localStorage.setItem('user_stars_balance', newBalance.toString());
  };

  const handleBuyPackage = async (pkg: StarPackage) => {
    if (kzBalance < pkg.priceKz) {
      showToast('Saldo em Kz insuficiente. Recarregue para comprar Stars.', 'error');
      navigate('/recarregar');
      return;
    }

    setPurchasingPkg(pkg.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const newKz = kzBalance - pkg.priceKz;
      const newStars = starsBalance + pkg.stars;

      setKzBalance(newKz);
      updateStarsBalance(newStars);

      showToast(`Adquirido ${pkg.stars} Estrelas com sucesso!`, 'success');
      setShowBuyModal(false);
    } catch {
      showToast('Erro ao processar compra de Estrelas', 'error');
    } finally {
      setPurchasingPkg(null);
    }
  };

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
      await new Promise((resolve) => setTimeout(resolve, 600));

      const convertedKz = numStars * 30; // 1 Star = 30 Kz
      const newStars = starsBalance - numStars;
      const newKz = kzBalance + convertedKz;

      updateStarsBalance(newStars);
      setKzBalance(newKz);

      showToast(`Convertido ${numStars} Stars em ${formatCurrency(convertedKz, 'KZ')}!`, 'success');
      setShowConvertModal(false);
      setConvertAmount('');
    } catch {
      showToast('Erro ao converter Estrelas.', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f2f4] font-sans antialiased text-[#111111] flex flex-col items-center select-none pb-12">
      
      {/* ── HEADER TRANSPARENTE ── */}
      <header className="w-full max-w-[480px] px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-[#111111] active:opacity-60 transition-opacity cursor-pointer rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2]" />
        </button>
      </header>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="w-full max-w-[440px] px-4 flex flex-col items-center gap-5 pt-1">
        
        {/* Ícone 3D Grande da Estrela Dourada do Telegram */}
        <div className="w-28 h-28 my-1 flex items-center justify-center relative">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_16px_rgba(245,166,35,0.3)]">
            <defs>
              <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffee55" />
                <stop offset="50%" stopColor="#ffc107" />
                <stop offset="100%" stopColor="#ff9800" />
              </linearGradient>
            </defs>
            <path
              d="M50 5 L63 33 L95 38 L72 61 L77 93 L50 78 L23 93 L28 61 L5 38 L37 33 Z"
              fill="url(#starGradient)"
              rx="4"
            />
          </svg>
        </div>

        {/* Título e Descrição Oficiais */}
        <div className="text-center px-4">
          <h1 className="text-[23px] font-bold text-[#111111] tracking-tight mb-1.5">
            Estrelas do Telegram
          </h1>
          <p className="text-[13.5px] text-[#707579] leading-relaxed">
            Compre Estrelas para desbloquear conteúdos e serviços em miniapps no Telegram.{' '}
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="text-[#00a884] font-semibold hover:underline inline-flex items-center cursor-pointer bg-transparent border-none p-0"
            >
              Saiba mais &gt;
            </button>
          </p>
        </div>

        {/* ── CARD 1: SALDO E BOTÕES PRINCIPAIS ── */}
        <div className="w-full bg-white rounded-[20px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/60 flex flex-col items-center text-center">
          {/* Saldo de Estrelas */}
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <svg viewBox="0 0 100 100" className="w-7 h-7 shrink-0">
              <path
                d="M50 5 L63 33 L95 38 L72 61 L77 93 L50 78 L23 93 L28 61 L5 38 L37 33 Z"
                fill="url(#starGradient)"
              />
            </svg>
            <span className="text-[34px] font-bold text-[#111111] leading-none tracking-tight">
              {starsBalance}
            </span>
          </div>
          <span className="text-[13px] text-[#8e8e93] mb-6 font-normal">seu saldo</span>

          {/* Botão Principal Verde: Comprar Estrelas */}
          <button
            type="button"
            onClick={() => setShowBuyModal(true)}
            className="w-full h-[48px] rounded-full bg-[#10b981] hover:bg-[#059669] active:scale-[0.98] text-white font-semibold text-[16px] shadow-xs transition-all cursor-pointer mb-4 flex items-center justify-center border-none"
          >
            Comprar Estrelas
          </button>

          {/* Botão Secundário: Presentear Amigos com Estrelas */}
          <button
            type="button"
            onClick={() => navigate('/convite')}
            className="flex items-center justify-center gap-2 text-[#00a884] font-semibold text-[15px] hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer bg-transparent border-none py-1"
          >
            <Users className="w-5 h-5 text-[#00a884] stroke-[2.2]" />
            <span>Presentear Amigos com Estrelas</span>
          </button>

          {starsBalance > 0 && (
            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              className="mt-3 text-[13px] text-gray-500 font-medium hover:text-[#10b981] underline cursor-pointer bg-transparent border-none"
            >
              Converter {starsBalance} Stars para Kz
            </button>
          )}
        </div>

        {/* ── CARD 2: GANHE ESTRELAS ── */}
        <div
          onClick={() => navigate('/telegram-premium')}
          className="w-full bg-white rounded-[20px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/60 flex items-center justify-between cursor-pointer hover:bg-gray-50/90 active:bg-gray-100/80 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#10b981] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Sparkles className="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15.5px] font-bold text-[#111111]">Ganhe Estrelas</h3>
                <span className="bg-[#3390ec] text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                  NEW
                </span>
              </div>
              <p className="text-[12.5px] text-[#707579] leading-snug mt-0.5">
                Distribua links para miniapps e ganhe uma parte da receita deles em Estrelas.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#c7c7cc] shrink-0" />
        </div>

      </main>

      {/* ── MODAL: COMPRAR ESTRELAS (LIGHT MODE BOTTOM SHEET) ── */}
      <AnimatePresence>
        {showBuyModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs"
            onClick={(e) => e.target === e.currentTarget && setShowBuyModal(false)}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-[480px] bg-white rounded-t-[24px] p-5 shadow-2xl border-t border-gray-200 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-[18px] font-bold text-[#111111] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#10b981]" />
                  Adquirir Pacotes de Estrelas
                </h2>
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-[13px] text-gray-500 bg-gray-50 p-3 rounded-[14px]">
                Saldo disponível em conta: <strong className="text-black">{formatCurrency(kzBalance, 'KZ')}</strong>
              </div>

              <div className="flex flex-col gap-2.5">
                {STAR_PACKAGES.map((pkg) => {
                  const isLoadingThis = purchasingPkg === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      className="p-3.5 rounded-[16px] border border-gray-200/80 bg-white hover:border-[#10b981] flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 100 100" className="w-6 h-6">
                            <path d="M50 5 L63 33 L95 38 L72 61 L77 93 L50 78 L23 93 L28 61 L5 38 L37 33 Z" fill="url(#starGradient)" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[16px] font-bold text-black">{pkg.stars} Estrelas</span>
                            {pkg.badge && (
                              <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${pkg.badgeColor}`}>
                                {pkg.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] text-gray-500 font-medium">
                            {formatCurrency(pkg.priceKz, 'KZ')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleBuyPackage(pkg)}
                        disabled={isLoadingThis}
                        className="px-4 py-2 rounded-full bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-[13.5px] cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                      >
                        {isLoadingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Comprar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: SAIBA MAIS ── */}
      <AnimatePresence>
        {showInfoModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs"
            onClick={(e) => e.target === e.currentTarget && setShowInfoModal(false)}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              className="w-full max-w-[480px] bg-white rounded-t-[24px] p-6 shadow-2xl border-t border-gray-200 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-[18px] font-bold text-[#111111] flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#10b981]" />
                  Sobre as Estrelas do Telegram
                </h2>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-[13.5px] text-gray-600 leading-relaxed">
                <p>
                  As <strong>Estrelas do Telegram</strong> são os bens digitais oficiais utilizados para ativar Bots, acessar conteúdos exclusivos e presentear parceiros na plataforma.
                </p>
                <p>
                  Você pode comprar pacotes de Estrelas ou convertê-las novamente em saldo em Kz a qualquer momento com taxa fixa.
                </p>
              </div>

              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full h-11 rounded-full bg-[#10b981] text-white font-semibold text-[15px] cursor-pointer mt-2"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: CONVERTER ESTRELAS EM KZ ── */}
      <AnimatePresence>
        {showConvertModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs"
            onClick={(e) => e.target === e.currentTarget && setShowConvertModal(false)}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              className="w-full max-w-[480px] bg-white rounded-t-[24px] p-6 shadow-2xl border-t border-gray-200 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-[18px] font-bold text-[#111111] flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-[#10b981]" />
                  Converter Stars em Kz
                </h2>
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-emerald-50 p-3 rounded-[14px] border border-emerald-100 text-[13px] text-emerald-800 flex justify-between">
                  <span>Taxa de Conversão:</span>
                  <strong>1 Star = 30,00 Kz</strong>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-gray-700">Quantidade de Estrelas:</label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min="1"
                      max={starsBalance}
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      className="w-full h-11 bg-gray-50 border border-gray-200 rounded-[14px] px-4 text-[16px] font-bold text-black outline-none focus:border-[#10b981]"
                    />
                    <button
                      onClick={() => setConvertAmount(starsBalance.toString())}
                      className="absolute right-3 text-[11px] font-bold text-[#10b981] bg-emerald-100 px-2 py-1 rounded-md"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {parseInt(convertAmount, 10) > 0 && (
                  <div className="p-3 bg-gray-50 rounded-[14px] flex justify-between items-center text-[14px]">
                    <span className="text-gray-600">Você receberá no saldo:</span>
                    <strong className="text-[#10b981] font-bold text-[16px]">
                      +{formatCurrency((parseInt(convertAmount, 10) || 0) * 30, 'KZ')}
                    </strong>
                  </div>
                )}

                <button
                  onClick={handleConvertStars}
                  disabled={isConverting || !convertAmount || parseInt(convertAmount, 10) <= 0}
                  className="w-full h-12 rounded-full bg-[#10b981] text-white font-semibold text-[15px] shadow-sm cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isConverting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Conversão'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
