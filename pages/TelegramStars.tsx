import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ChevronRight, X, Loader2, ArrowRightLeft, ShoppingBag, Info
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
    <div className="w-full min-h-screen bg-[#f3f4f6] font-sans antialiased text-[#000000] flex flex-col items-center select-none pb-12">
      
      {/* ── TOP HEADER (BOTÃO VOLTAR APENAS) ── */}
      <header className="w-full max-w-[480px] px-4 pt-3 pb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1 && window.history.state?.idx > 0) {
              navigate(-1);
            } else {
              navigate('/home');
            }
          }}
          className="p-2 -ml-2 text-[#000000] active:opacity-50 hover:opacity-75 transition-opacity cursor-pointer rounded-full border-none bg-transparent touch-manipulation z-30"
          aria-label="Voltar"
          title="Voltar"
        >
          <ArrowLeft className="w-6 h-6 stroke-[2]" />
        </button>
      </header>

      {/* ── CONTEÚDO PRINCIPAL (EXATAMENTE COMO A REFERÊNCIA) ── */}
      <main className="w-full max-w-[410px] px-4 flex flex-col items-center gap-4 pt-0">
        
        {/* ILUSTRAÇÃO DA ESTRELA OFICIAL TELEGRAM */}
        <div className="w-32 h-32 my-1 flex items-center justify-center relative">
          <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_8px_20px_rgba(245,180,0,0.3)]">
            <defs>
              <linearGradient id="tgStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff555" />
                <stop offset="50%" stopColor="#ffca00" />
                <stop offset="100%" stopColor="#ff9500" />
              </linearGradient>
              <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#fff8bb" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {/* Smooth 3D Star Body */}
            <path
              d="M60 8 C62 8 64.5 12 66.5 16.5 L75.5 35 L95.5 38 C99.5 38.5 101 43 98 46 L83 61 L86.5 81 C87.2 85 83 88 79.5 86 L60 76 L40.5 86 C37 88 32.8 85 33.5 81 L37 61 L22 46 C19 43 20.5 38.5 24.5 38 L44.5 35 L53.5 16.5 C55.5 12 58 8 60 8 Z"
              fill="url(#tgStarGrad)"
            />
            {/* Telegram Paper Plane Curve fold inside Star */}
            <path
              d="M58 24 C68 34 76 46 62 68 C56 60 48 50 58 24 Z"
              fill="url(#planeGrad)"
            />
          </svg>
        </div>

        {/* TÍTULO E DESCRITIVO */}
        <div className="text-center px-1">
          <h1 className="text-[22px] font-bold text-[#000000] tracking-tight mb-2">
            Estrelas do Telegram
          </h1>
          <p className="text-[14px] text-[#707579] leading-[1.35] max-w-[320px] mx-auto">
            Compre Estrelas para desbloquear conteúdos e serviços em miniapps no Telegram.{' '}
            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="text-[#16c66f] font-semibold hover:underline inline-flex items-center cursor-pointer bg-transparent border-none p-0 ml-0.5"
            >
              Saiba mais &gt;
            </button>
          </p>
        </div>

        {/* ── CARD 1: SALDO, BOTÃO VERDE E LINK PRESENTEAR ── */}
        <div className="w-full bg-white rounded-[24px] p-6 shadow-none border border-black/5 flex flex-col items-center text-center">
          {/* Saldo de Estrelas */}
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <svg viewBox="0 0 100 100" className="w-8 h-8 shrink-0">
              <path
                d="M50 5 L63 33 L95 38 L72 61 L77 93 L50 78 L23 93 L28 61 L5 38 L37 33 Z"
                fill="url(#tgStarGrad)"
              />
            </svg>
            <span className="text-[36px] font-bold text-[#000000] leading-none tracking-tight">
              {starsBalance}
            </span>
          </div>
          <span className="text-[14px] text-[#8e8e93] mb-6 font-normal">seu saldo</span>

          {/* Botão Principal Verde: Comprar Estrelas */}
          <button
            type="button"
            onClick={() => setShowBuyModal(true)}
            className="w-full h-[52px] rounded-full bg-[#16c66f] hover:bg-[#13b564] active:scale-[0.98] text-white font-semibold text-[16px] transition-all cursor-pointer mb-5 flex items-center justify-center border-none shadow-none"
          >
            Comprar Estrelas
          </button>

          {/* Botão Secundário: Presentear Amigos com Estrelas */}
          <button
            type="button"
            onClick={() => navigate('/convite')}
            className="flex items-center justify-center gap-2 text-[#16c66f] font-semibold text-[15px] hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer bg-transparent border-none py-0.5"
          >
            {/* Ícone de 2 pessoas + estrelas estilo Telegram */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#16c66f] fill-none stroke-current stroke-[2]">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Presentear Amigos com Estrelas</span>
          </button>

          {starsBalance > 0 && (
            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              className="mt-3 text-[13px] text-gray-500 font-medium hover:text-[#16c66f] underline cursor-pointer bg-transparent border-none"
            >
              Converter {starsBalance} Stars para Kz
            </button>
          )}
        </div>

        {/* ── CARD 2: GANHE ESTRELAS ── */}
        <div
          onClick={() => navigate('/telegram-premium')}
          className="w-full bg-white rounded-[24px] p-4.5 shadow-none border border-black/5 flex items-center justify-between cursor-pointer hover:bg-gray-50/90 active:bg-gray-100/80 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#16c66f] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[16px] font-bold text-[#000000]">Ganhe Estrelas</h3>
                <span className="bg-[#3390ec] text-white text-[9.5px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                  NEW
                </span>
              </div>
              <p className="text-[12.5px] text-[#8e8e93] leading-[1.3] mt-0.5">
                Distribua links para miniapps e ganhe uma parte da receita deles em Estrelas.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#c7c7cc] shrink-0" />
        </div>

      </main>

      {/* ── MODAL: COMPRAR ESTRELAS ── */}
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
                <h2 className="text-[18px] font-bold text-[#000000] flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#16c66f]" />
                  Adquirir Pacotes de Estrelas
                </h2>
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 cursor-pointer border-none"
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
                      className="p-3.5 rounded-[16px] border border-gray-200/80 bg-white hover:border-[#16c66f] flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 100 100" className="w-6 h-6">
                            <path d="M50 5 L63 33 L95 38 L72 61 L77 93 L50 78 L23 93 L28 61 L5 38 L37 33 Z" fill="url(#tgStarGrad)" />
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
                        className="px-4 py-2 rounded-full bg-[#16c66f] hover:bg-[#13b564] text-white font-semibold text-[13.5px] cursor-pointer active:scale-95 transition-all flex items-center gap-1 border-none"
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
                <h2 className="text-[18px] font-bold text-[#000000] flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#16c66f]" />
                  Sobre as Estrelas do Telegram
                </h2>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 cursor-pointer border-none"
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
                className="w-full h-11 rounded-full bg-[#16c66f] text-white font-semibold text-[15px] cursor-pointer mt-2 border-none"
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
                <h2 className="text-[18px] font-bold text-[#000000] flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-[#16c66f]" />
                  Converter Stars em Kz
                </h2>
                <button
                  onClick={() => setShowConvertModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 bg-gray-100 cursor-pointer border-none"
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
                      className="w-full h-11 bg-gray-50 border border-gray-200 rounded-[14px] px-4 text-[16px] font-bold text-black outline-none focus:border-[#16c66f]"
                    />
                    <button
                      onClick={() => setConvertAmount(starsBalance.toString())}
                      className="absolute right-3 text-[11px] font-bold text-[#16c66f] bg-emerald-100 px-2 py-1 rounded-md cursor-pointer border-none"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {parseInt(convertAmount, 10) > 0 && (
                  <div className="p-3 bg-gray-50 rounded-[14px] flex justify-between items-center text-[14px]">
                    <span className="text-gray-600">Você receberá no saldo:</span>
                    <strong className="text-[#16c66f] font-bold text-[16px]">
                      +{formatCurrency((parseInt(convertAmount, 10) || 0) * 30, 'KZ')}
                    </strong>
                  </div>
                )}

                <button
                  onClick={handleConvertStars}
                  disabled={isConverting || !convertAmount || parseInt(convertAmount, 10) <= 0}
                  className="w-full h-12 rounded-full bg-[#16c66f] text-white font-semibold text-[15px] shadow-sm cursor-pointer flex items-center justify-center gap-2 mt-2 border-none"
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
