import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, Sparkles, Star, TrendingUp, Zap, ShieldCheck, Award } from 'lucide-react';

export interface StoryItem {
  id: string;
  title: string;
  avatar: string;
  hasUnread: boolean;
  slides: {
    id: string;
    image: string;
    badge: string;
    badgeBg: string;
    headline: string;
    subtext: string;
    actionText: string;
    actionLink: string;
    gradient: string;
  }[];
}

const STORIES_DATA: StoryItem[] = [
  {
    id: 'story-stars',
    title: 'Estrelas',
    avatar: '/tg_stars_gold.jpg',
    hasUnread: true,
    slides: [
      {
        id: 'stars-1',
        image: '/tg_stars_gold.jpg',
        badge: 'TELEGRAM STARS',
        badgeBg: 'bg-[#f59e0b]',
        headline: 'Chegou o Sistema de Telegram Stars! 🌟',
        subtext: 'Compre pacotes de Estrelas digitais ou converta o seu saldo acumulado diretamente para Kwanzas via IBAN.',
        actionText: 'Acessar Telegram Stars',
        actionLink: '/stars',
        gradient: 'from-[#b45309] via-[#78350f] to-[#0f1015]'
      }
    ]
  },
  {
    id: 'story-saques',
    title: 'Saques Paga',
    avatar: '/tg_banner_4.jpg',
    hasUnread: true,
    slides: [
      {
        id: 'saques-1',
        image: '/tg_banner_4.jpg',
        badge: 'PROVA SOCIAL',
        badgeBg: 'bg-[#10b981]',
        headline: 'Saques Aprovados em Segundos 💸',
        subtext: 'Milhares de membros já retiraram os seus ganhos via Multicaixa Express e IBAN direto em Angola.',
        actionText: 'Ver Histórico de Saques',
        actionLink: '/perfil',
        gradient: 'from-[#047857] via-[#065f46] to-[#0f1015]'
      }
    ]
  },
  {
    id: 'story-bots',
    title: 'Novos Bots',
    avatar: '/bot_botfather.jpg',
    hasUnread: true,
    slides: [
      {
        id: 'bots-1',
        image: '/bot_botfather.jpg',
        badge: 'SUPER BOTS',
        badgeBg: 'bg-[#8b5cf6]',
        headline: 'Ative Bots de Alta Rentabilidade 🤖',
        subtext: 'Escolha os melhores Bots oficiais com rendimento diário automático e retorno garantido.',
        actionText: 'Explorar Loja de Bots',
        actionLink: '/bot-pay',
        gradient: 'from-[#6d28d9] via-[#4c1d95] to-[#0f1015]'
      }
    ]
  },
  {
    id: 'story-afiliados',
    title: 'Comissões',
    avatar: '/pavel_durov.jpg',
    hasUnread: true,
    slides: [
      {
        id: 'afiliados-1',
        image: '/pavel_durov.jpg',
        badge: 'PROGRAMA DE AFILIADOS',
        badgeBg: 'bg-[#3b82f6]',
        headline: 'Ganhe até 18% em 3 Níveis de Rede ⭐',
        subtext: 'Nível 1 (10%), Nível 2 (6%) e Nível 3 (2%). Receba comissões instantâneas quando amigos ativarem Bots.',
        actionText: 'Ver Regras & Simulador',
        actionLink: '/telegram-premium',
        gradient: 'from-[#1d4ed8] via-[#1e40af] to-[#0f1015]'
      }
    ]
  }
];

export default function TelegramStories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<StoryItem[]>(() => {
    const readMap = JSON.parse(localStorage.getItem('read_stories') || '{}');
    return STORIES_DATA.map(st => ({
      ...st,
      hasUnread: !readMap[st.id]
    }));
  });

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const progressInterval = useRef<any>(null);

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;
  const activeSlide = activeStory ? activeStory.slides[activeSlideIndex] : null;

  // Mark story as read
  const markAsRead = (storyId: string) => {
    const readMap = JSON.parse(localStorage.getItem('read_stories') || '{}');
    readMap[storyId] = true;
    localStorage.setItem('read_stories', JSON.stringify(readMap));

    setStories(prev => prev.map(s => s.id === storyId ? { ...s, hasUnread: false } : s));
  };

  const handleOpenStory = (index: number) => {
    setActiveStoryIndex(index);
    setActiveSlideIndex(0);
    setProgress(0);
    markAsRead(stories[index].id);
  };

  const handleClose = useCallback(() => {
    setActiveStoryIndex(null);
    setActiveSlideIndex(0);
    setProgress(0);
  }, []);

  const handleNextSlide = useCallback(() => {
    if (activeStoryIndex === null || !activeStory) return;

    if (activeSlideIndex < activeStory.slides.length - 1) {
      setActiveSlideIndex(prev => prev + 1);
      setProgress(0);
    } else if (activeStoryIndex < stories.length - 1) {
      const nextIndex = activeStoryIndex + 1;
      setActiveStoryIndex(nextIndex);
      setActiveSlideIndex(0);
      setProgress(0);
      markAsRead(stories[nextIndex].id);
    } else {
      handleClose();
    }
  }, [activeStoryIndex, activeStory, activeSlideIndex, stories, handleClose]);

  const handlePrevSlide = useCallback(() => {
    if (activeStoryIndex === null || !activeStory) return;

    if (activeSlideIndex > 0) {
      setActiveSlideIndex(prev => prev - 1);
      setProgress(0);
    } else if (activeStoryIndex > 0) {
      const prevIndex = activeStoryIndex - 1;
      setActiveStoryIndex(prevIndex);
      setActiveSlideIndex(0);
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [activeStoryIndex, activeStory, activeSlideIndex]);

  // Timer loop for stories (5 seconds per slide)
  useEffect(() => {
    if (activeStoryIndex === null || isPaused) return;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNextSlide();
          return 0;
        }
        return prev + 2; // 50 steps * 100ms = 5000ms (5s)
      });
    }, 100);

    progressInterval.current = timer;

    return () => {
      clearInterval(timer);
    };
  }, [activeStoryIndex, activeSlideIndex, isPaused, handleNextSlide]);

  return (
    <>
      {/* ── CÍRCULOS DE HISTÓRIAS (TOPO DOS CHATS) ── */}
      <div className="w-full bg-white px-3 py-2.5 border-b border-gray-100 overflow-x-auto no-scrollbar flex items-center gap-3">
        {stories.map((story, idx) => (
          <button
            key={story.id}
            onClick={() => handleOpenStory(idx)}
            className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer border-none bg-transparent outline-none"
          >
            {/* Anel do Telegram Stories */}
            <div className={`p-[2.5px] rounded-full transition-transform active:scale-95 ${
              story.hasUnread 
                ? 'bg-gradient-to-tr from-[#ec4899] via-[#8b5cf6] to-[#3b82f6] shadow-xs' 
                : 'bg-gray-300'
            }`}>
              <div className="w-[54px] h-[54px] rounded-full p-[2px] bg-white">
                <img
                  src={story.avatar}
                  alt={story.title}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
            <span className={`text-[11.5px] font-medium tracking-tight truncate max-w-[62px] ${
              story.hasUnread ? 'text-[#111111] font-semibold' : 'text-[#8e8e93]'
            }`}>
              {story.title}
            </span>
          </button>
        ))}
      </div>

      {/* ── FULL SCREEN STORIES VIEWER MODAL ── */}
      <AnimatePresence>
        {activeStory && activeSlide && (
          <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`relative w-full max-w-[440px] h-full md:h-[90vh] md:rounded-[24px] overflow-hidden bg-gradient-to-b ${activeSlide.gradient} text-white flex flex-col justify-between p-4 shadow-2xl`}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
            >
              {/* Top Progress Bars */}
              <div className="w-full flex gap-1 z-30 pt-2">
                {activeStory.slides.map((s, i) => (
                  <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all ease-linear"
                      style={{
                        width: i < activeSlideIndex ? '100%' : i === activeSlideIndex ? `${progress}%` : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header Info */}
              <div className="w-full flex items-center justify-between z-30 pt-3 px-1">
                <div className="flex items-center gap-2.5">
                  <img src={activeStory.avatar} alt={activeStory.title} className="w-9 h-9 rounded-full object-cover border border-white/40" />
                  <div>
                    <h4 className="text-[14px] font-bold text-white leading-tight">{activeStory.title}</h4>
                    <span className="text-[11px] text-white/70">Oficial Telegram</span>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-full bg-black/40 text-white/90 hover:text-white hover:bg-black/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Touch Control Overlay (Left / Right) */}
              <div className="absolute inset-0 z-20 flex">
                <div className="w-1/3 h-full cursor-pointer" onClick={handlePrevSlide} />
                <div className="w-2/3 h-full cursor-pointer" onClick={handleNextSlide} />
              </div>

              {/* Middle Image / Graphic */}
              <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 py-6 text-center">
                <div className="w-36 h-36 rounded-[24px] overflow-hidden bg-white/10 p-2 shadow-2xl mb-6 border border-white/20">
                  <img src={activeSlide.image} alt={activeSlide.headline} className="w-full h-full object-cover rounded-[18px]" />
                </div>

                <span className={`px-3 py-1 rounded-full text-[11px] font-bold text-white mb-3 shadow-sm ${activeSlide.badgeBg}`}>
                  {activeSlide.badge}
                </span>

                <h2 className="text-[22px] font-extrabold text-white mb-2 leading-snug">
                  {activeSlide.headline}
                </h2>

                <p className="text-[13.5px] text-white/80 leading-relaxed max-w-[340px]">
                  {activeSlide.subtext}
                </p>
              </div>

              {/* Action Button Footer */}
              <div className="w-full z-30 pb-4 pt-2">
                <button
                  onClick={() => {
                    handleClose();
                    navigate(activeSlide.actionLink);
                  }}
                  className="w-full h-[52px] rounded-[16px] bg-white text-black font-extrabold text-[15.5px] shadow-lg hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                >
                  <span>{activeSlide.actionText}</span>
                  <ChevronRight className="w-5 h-5 text-black" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
