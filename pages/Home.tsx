import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles, TrendingUp, ShieldCheck, Headphones, Zap, Crown, Check, User, Plus, ArrowDownToLine, Gift } from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   DADOS DOS 6 BANNERS DO CARROSSEL
══════════════════════════════════════════════════════════════ */
const BANNERS = [
  {
    id: 1,
    image: "/tg_banner_1.jpg",
    title: "Telegram Business",
    subtitle: "Ferramentas profissionais para expandir o seu negócio",
    badge: "OFICIAL",
    badgeBg: "bg-[#0088cc]",
    actionText: "Conhecer Planos",
    link: "/bot-pay",
    icon: <Zap className="w-4 h-4 text-white" />,
  },
  {
    id: 2,
    image: "/tg_banner_2.jpg",
    title: "Telegram Premium VIP",
    subtitle: "Recursos exclusivos e limites duplicados para a sua conta",
    badge: "VIP",
    badgeBg: "bg-[#8d54d9]",
    actionText: "Ativar Premium",
    link: "/bot-pay",
    icon: <Crown className="w-4 h-4 text-white" />,
  },
  {
    id: 3,
    image: "/tg_banner_3.jpg",
    title: "Telegram Stars",
    subtitle: "Desbloqueie conteúdos e miniapps com estrelas digitais",
    badge: "STARS",
    badgeBg: "bg-[#f59e0b]",
    actionText: "Comprar Stars",
    link: "/bot-pay",
    icon: <Sparkles className="w-4 h-4 text-white" />,
  },
  {
    id: 4,
    image: "/tg_banner_4.jpg",
    title: "Rendimento Diário Garantido",
    subtitle: "Acompanhe os lucros e rendimentos diários na sua carteira",
    badge: "RENDIMENTO",
    badgeBg: "bg-[#25D366]",
    actionText: "Ver Saldo",
    link: "/perfil",
    icon: <TrendingUp className="w-4 h-4 text-white" />,
  },
  {
    id: 5,
    image: "/tg_banner_5.jpg",
    title: "Retiradas Rápidas 24/7",
    subtitle: "Pagamentos e transferências bancárias com segurança máxima",
    badge: "SEGURO",
    badgeBg: "bg-[#0ea5e9]",
    actionText: "Solicitar Retirada",
    link: "/retirada",
    icon: <ShieldCheck className="w-4 h-4 text-white" />,
  },
  {
    id: 6,
    image: "/tg_banner_6.jpg",
    title: "Comunidade VIP & Suporte",
    subtitle: "Acesso direto ao chat oficial e atendimento personalizado 24/7",
    badge: "SUPORTE",
    badgeBg: "bg-[#06b6d4]",
    actionText: "Entrar no Chat",
    link: "/telegramBussiness",
    icon: <Headphones className="w-4 h-4 text-white" />,
  },
];

interface Withdrawal {
  id: number;
  name: string;
  amount: number;
  time: string;
  type: string;
  avatarColor: string;
}

const INITIAL_WITHDRAWALS: Withdrawal[] = [
  { id: 1, name: "+244 923 *** 481", amount: 15000, time: "Há 1 min", type: "IBAN", avatarColor: "bg-emerald-500" },
  { id: 2, name: "+244 934 *** 192", amount: 35000, time: "Há 3 min", type: "IBAN", avatarColor: "bg-blue-500" },
  { id: 3, name: "+244 945 *** 023", amount: 120000, time: "Há 5 min", type: "IBAN", avatarColor: "bg-purple-500" },
  { id: 4, name: "+244 912 *** 875", amount: 8000, time: "Há 8 min", type: "IBAN", avatarColor: "bg-amber-500" },
];

const NAMES = [
  "+244 921 *** 664",
  "+244 932 *** 559",
  "+244 949 *** 331",
  "+244 917 *** 420",
  "+244 928 *** 771",
  "+244 939 *** 908",
  "+244 924 *** 118",
  "+244 935 *** 229",
  "+244 946 *** 330",
  "+244 913 *** 441",
  "+244 925 *** 552",
  "+244 936 *** 663",
  "+244 947 *** 774",
  "+244 918 *** 885"
];
const COLORS = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-rose-500", "bg-indigo-500", "bg-sky-500"];

export default function Home() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(INITIAL_WITHDRAWALS);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomName = NAMES[Math.floor(Math.random() * NAMES.length)];
      const randomAmount = Math.floor(Math.random() * 120000) + 5000;
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      const randomType = Math.random() > 0.15 ? "IBAN" : "USDT";

      const newWithdrawal: Withdrawal = {
        id: Date.now(),
        name: randomName,
        amount: randomAmount,
        time: "Agora mesmo",
        type: randomType,
        avatarColor: randomColor,
      };

      setWithdrawals((prev) => {
        const updatedPrev = prev.map((w, idx) => {
          if (idx === 0) return { ...w, time: "Há 1 min" };
          if (idx === 1) return { ...w, time: "Há 3 min" };
          return w;
        });
        return [newWithdrawal, ...updatedPrev.slice(0, 3)];
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  /* ── Próximo Slide (Loop infinito contínuo da direita para esquerda) ── */
  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % BANNERS.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  }, []);

  /* ── Autoplay a cada 3.5 segundos ── */
  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide, isPaused]);

  /* ── Gestos de Touch / Swipe ── */
  const onTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    if (Math.abs(e.touches[0].clientX - touchStartX.current) > 8) {
      isDragging.current = true;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && isDragging.current) {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (dx < -40) nextSlide();
      else if (dx > 40) prevSlide();
    }
    touchStartX.current = null;
    isDragging.current = false;
    setTimeout(() => setIsPaused(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black flex flex-col relative overflow-x-hidden pb-28">

      {/* ── HEADER MODO WEB: Ícone e Texto alinhados diretamente à esquerda ── */}
      <header className="w-full px-4 pt-3.5 pb-3 flex items-center justify-between sticky top-0 bg-white z-20 border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5">
          {/* Telegram Logo Oficial */}
          <div className="w-[36px] h-[36px] rounded-full bg-linear-to-tr from-[#1e96c8] to-[#37aee2] flex items-center justify-center shadow-xs shrink-0">
            <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
              <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
            </svg>
          </div>
          <h1 className="text-[18px] font-semibold text-gray-900 leading-none">
            Telegram Business
          </h1>
        </div>
      </header>

      {/* ── CARROSSEL COM MARGEM DE 8PX À ESQUERDA E DIREITA ── */}
      <main className="w-full flex flex-col px-2 pt-1">

        {/* Container do Carrossel com 8px de margem lateral e cantos arredondados */}
        <div
          className="relative w-full rounded-[12px] overflow-hidden bg-black shadow-sm"
          style={{ aspectRatio: "16 / 8.5" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Trilha de slides com transição suave da direita para a esquerda */}
          <div
            className="flex w-full h-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {BANNERS.map((banner, index) => (
              <div
                key={banner.id}
                className="w-full h-full shrink-0 relative cursor-pointer select-none"
                onClick={() => navigate(banner.link)}
              >
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                />

                {/* Overlay gradiente sobre o banner */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end px-4 sm:px-6 md:px-10 pb-5 md:pb-8 text-white">
                  
                  {/* Badge */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] md:text-[12px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white ${banner.badgeBg} shadow-xs`}>
                      {banner.icon}
                      {banner.badge}
                    </span>
                  </div>

                  {/* Título & Subtítulo */}
                  <h2 className="text-[19px] sm:text-[24px] md:text-[28px] font-bold leading-tight mb-1 text-white drop-shadow-md">
                    {banner.title}
                  </h2>
                  <p className="text-[13px] sm:text-[15px] md:text-[16px] text-white/90 leading-snug line-clamp-2 max-w-[95%] drop-shadow-sm">
                    {banner.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Botões de navegação lateral */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-95 cursor-pointer z-10"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-9 h-9 md:w-11 md:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-95 cursor-pointer z-10"
            aria-label="Próximo"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5] rotate-180" />
          </button>
        </div>

        {/* ── BOTÕES DE AÇÃO RÁPIDA (ESTILO TELEGRAM) ── */}
        <div className="grid grid-cols-3 gap-3 px-3 py-4 bg-white rounded-[12px] mt-3 border border-gray-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          
          {/* Botão Adicionar Saldo */}
          <button
            onClick={() => navigate("/recarregar")}
            className="flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-[52px] h-[52px] rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc] transition-colors hover:bg-[#0088cc]/20">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[12px] font-medium text-gray-700 text-center leading-tight">
              Adicionar Saldo
            </span>
          </button>

          {/* Botão Retirar Saldo */}
          <button
            onClick={() => navigate("/retirada")}
            className="flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-[52px] h-[52px] rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc] transition-colors hover:bg-[#0088cc]/20">
              <ArrowDownToLine className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[12px] font-medium text-gray-700 text-center leading-tight">
              Retirar Saldo
            </span>
          </button>

          {/* Botão Prêmios */}
          <button
            onClick={() => navigate("/resgate")}
            className="flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-[52px] h-[52px] rounded-full bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc] transition-colors hover:bg-[#0088cc]/20">
              <Gift className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[12px] font-medium text-gray-700 text-center leading-tight">
              Prêmios
            </span>
          </button>

        </div>

        {/* ── SEÇÃO DE PROVA SOCIAL: RETIRADAS EM TEMPO REAL ── */}
        <div className="mt-4 px-1">
          {/* Título com indicador de "Ao Vivo" */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                Atividade de Saques
              </h3>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#0088cc] font-semibold bg-[#e5f3fc] px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-[#0088cc] rounded-full animate-pulse"></span>
              Ao vivo
            </div>
          </div>

          {/* Container do Feed de Transações */}
          <div className="bg-white rounded-[12px] border border-gray-200/40 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            {withdrawals.map((w, index) => (
              <React.Fragment key={w.id}>
                <div className="flex items-center justify-between p-3.5 hover:bg-gray-50/50 transition-colors animate-slide-in-fade">
                  <div className="flex items-center gap-3">
                    {/* Avatar do Usuário */}
                    <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center text-white shadow-xs shrink-0 ${w.avatarColor}`}>
                      <User className="w-5 h-5 text-white/95" />
                    </div>

                    {/* Nome e Status */}
                    <div className="flex flex-col">
                      <span className="text-[14.5px] font-semibold text-gray-900 leading-tight">
                        {w.name}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-[14px] h-[14px] rounded-full bg-[#e5f5e9] flex items-center justify-center text-[#25D366] shrink-0">
                          <Check className="w-[10px] h-[10px] stroke-[3]" />
                        </span>
                        <span className="text-[11.5px] text-gray-500 font-medium">
                          Saque realizado com sucesso
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Valor e Detalhes da transação */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[14.5px] font-semibold text-[#25D366] leading-none flex items-center gap-0.5">
                      + AOA {w.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1.5 font-medium flex items-center gap-1">
                      <span className="bg-gray-100 text-gray-600 px-1 py-0.2 rounded-[3px] uppercase text-[9px] font-bold">
                        {w.type}
                      </span>
                      • {w.time}
                    </span>
                  </div>
                </div>
                {index < withdrawals.length - 1 && (
                  <div className="h-[1px] bg-gray-100/70 ml-[64px]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

      </main>

    </div>
  );
}
