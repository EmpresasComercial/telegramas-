import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Eye, Volume2, VolumeX, Share2, MoreVertical, 
  ThumbsUp, Heart, Flame, Rocket, ThumbsDown, Check, Sparkles, Megaphone
} from 'lucide-react';
import { useToast } from '../components/Toast';

interface ChannelPost {
  id: string;
  date: string;
  time: string;
  views: string;
  badge?: string;
  badgeBg?: string;
  title: string;
  content: string;
  image?: string;
  reactions: {
    thumbsUp: number;
    heart: number;
    fire: number;
    rocket: number;
  };
  userReaction?: string;
}

const INITIAL_POSTS: ChannelPost[] = [
  {
    id: 'post-1',
    date: '26 de Agosto',
    time: '14:30',
    views: '12.4K',
    badge: 'NOVIDADE OFICIAL',
    badgeBg: 'bg-[#3b82f6]',
    title: '🌟 Lançamento Oficial do Sistema Telegram Stars!',
    content: `Temos o prazer de anunciar o lançamento do novo sistema **Telegram Stars** na nossa aplicação!\n\nAgora você pode adquirir pacotes de Estrelas digitais para ativação rápida de Bots e serviços na plataforma, além de poder converter as suas Estrelas acumuladas diretamente em Kwanzas (Kz) para saque via IBAN ou Multicaixa Express a qualquer momento.\n\nAcesse a seção de Estrelas no seu menu de Perfil ou no topo da página inicial para conferir todos os benefícios!`,
    image: '/tg_stars_gold.jpg',
    reactions: { thumbsUp: 342, heart: 189, fire: 512, rocket: 275 }
  },
  {
    id: 'post-2',
    date: '25 de Agosto',
    time: '18:15',
    views: '15.8K',
    badge: 'SAQUES RÁPIDOS',
    badgeBg: 'bg-[#10b981]',
    title: '💸 Processamento de Saques via Multicaixa Express e IBAN',
    content: `Informamos a todos os membros parceiros que os saques solicitados via **Multicaixa Express** e **IBAN** estão sendo processados normalmente dentro do horário comercial com máxima velocidade.\n\nRecurso de prova social ativado: lembre-se de conferir as novidades no topo da tela de Chats para ver os comprovantes de retiradas dos membros da rede!`,
    image: '/tg_banner_4.jpg',
    reactions: { thumbsUp: 610, heart: 420, fire: 890, rocket: 340 }
  },
  {
    id: 'post-3',
    date: '24 de Agosto',
    time: '10:00',
    views: '9.2K',
    badge: 'SUPER BOTS',
    badgeBg: 'bg-[#8b5cf6]',
    title: '🤖 Bots de Alta Rentabilidade Atualizados',
    content: `Novos parâmetros de rendimento diário automático foram aplicados nos Bots de negociação da plataforma. Ao ativar um Bot, os rendimentos acumulados caem automaticamente no seu saldo disponível.\n\nConfira os detalhes de cada plano na aba de **Bots** da sua barra de navegação!`,
    image: '/bot_botfather.jpg',
    reactions: { thumbsUp: 280, heart: 145, fire: 390, rocket: 210 }
  }
];

export default function OfficialChannel() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [posts, setPosts] = useState<ChannelPost[]>(INITIAL_POSTS);
  const [isMuted, setIsMuted] = useState(false);
  const [isJoined, setIsJoined] = useState(true);
  const [subscribersCount, setSubscribersCount] = useState<number>(12840);

  const toggleReaction = (postId: string, reactionType: 'thumbsUp' | 'heart' | 'fire' | 'rocket') => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;

      const isCurrent = p.userReaction === reactionType;
      const updatedReactions = { ...p.reactions };

      if (isCurrent) {
        updatedReactions[reactionType] -= 1;
        return { ...p, reactions: updatedReactions, userReaction: undefined };
      } else {
        if (p.userReaction && p.userReaction in updatedReactions) {
          updatedReactions[p.userReaction as keyof typeof p.reactions] -= 1;
        }
        updatedReactions[reactionType] += 1;
        return { ...p, reactions: updatedReactions, userReaction: reactionType };
      }
    }));
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    showToast(isMuted ? 'Notificações ativadas para o canal' : 'Canal silenciado', 'info');
  };

  const handleToggleJoin = () => {
    if (isJoined) {
      setIsJoined(false);
      setSubscribersCount(prev => prev - 1);
      showToast('Você saiu do canal oficial', 'info');
    } else {
      setIsJoined(true);
      setSubscribersCount(prev => prev + 1);
      showToast('Você entrou no canal de anúncios oficial!', 'success');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#e6ebf0] font-sans antialiased text-[#111111] flex flex-col items-center select-none pb-20">
      
      {/* ── HEADER DE CANAL TELEGRAM ── */}
      <header className="w-full max-w-[540px] px-3 py-2.5 sticky top-0 z-40 bg-white shadow-2xs border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1 text-gray-700 hover:text-black active:bg-gray-100 rounded-full cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2]" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#06b6d4] flex items-center justify-center text-white shadow-xs shrink-0">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[15.5px] font-bold text-[#111111] leading-tight flex items-center gap-1.5">
                <span>Anúncios Telegram</span>
                <span className="w-4 h-4 bg-[#3390ec] rounded-full text-white text-[10px] font-black flex items-center justify-center">✓</span>
              </h1>
              <span className="text-[12px] text-[#707579]">
                {subscribersCount.toLocaleString()} inscritos
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleMute}
            className="p-2 text-gray-600 hover:text-black rounded-full hover:bg-gray-100 cursor-pointer"
            title={isMuted ? 'Desmutar' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── FEED DE PUBLICAÇÕES ── */}
      <main className="w-full max-w-[480px] px-3 pt-4 flex flex-col gap-5">
        
        {/* Banner de Boas-Vindas do Canal */}
        <div className="bg-white/80 backdrop-blur-md rounded-[18px] p-3.5 border border-white/60 shadow-2xs text-center">
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#3390ec] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Canal Unidirecional Oficial
          </span>
          <p className="text-[12.5px] text-[#707579] mt-2 leading-relaxed">
            Este é o canal oficial de transmissão de notícias, alertas de manutenção e provas sociais da plataforma.
          </p>
        </div>

        {posts.map((post) => (
          <article
            key={post.id}
            className="bg-white rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden flex flex-col"
          >
            {/* Header da publicação */}
            <div className="p-4 pb-2 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#3b82f6] text-white flex items-center justify-center text-[12px] font-bold">
                  TG
                </div>
                <span className="text-[13.5px] font-bold text-[#111111]">Anúncios Oficiais</span>
                {post.badge && (
                  <span className={`text-[9.5px] font-bold text-white px-2 py-0.5 rounded-full ${post.badgeBg}`}>
                    {post.badge}
                  </span>
                )}
              </div>
              <span className="text-[11.5px] text-[#8e8e93] font-medium">{post.time}</span>
            </div>

            {/* Imagem em destaque */}
            {post.image && (
              <div className="w-full h-48 bg-gray-100 overflow-hidden relative">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Conteúdo textual */}
            <div className="p-4 pt-3 space-y-2">
              <h2 className="text-[16px] font-bold text-[#111111] leading-snug">
                {post.title}
              </h2>
              <p className="text-[13.5px] text-[#333333] leading-relaxed whitespace-pre-line">
                {post.content}
              </p>
            </div>

            {/* Reações Interativas estilo Telegram */}
            <div className="px-4 py-2 border-t border-gray-50 flex items-center gap-1.5 flex-wrap">
              {[
                { type: 'thumbsUp' as const, emoji: '👍', count: post.reactions.thumbsUp },
                { type: 'heart' as const, emoji: '❤️', count: post.reactions.heart },
                { type: 'fire' as const, emoji: '🔥', count: post.reactions.fire },
                { type: 'rocket' as const, emoji: '🚀', count: post.reactions.rocket },
              ].map((r) => {
                const isSelected = post.userReaction === r.type;
                return (
                  <button
                    key={r.type}
                    onClick={() => toggleReaction(post.id, r.type)}
                    className={`px-2.5 py-1 rounded-full text-[12.5px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 text-[#3390ec] shadow-2xs scale-105'
                        : 'bg-gray-50 border-gray-200/80 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Rodapé com Contador de Visualizações 👁️ */}
            <div className="px-4 py-2.5 bg-gray-50/50 flex items-center justify-between border-t border-gray-100 text-[12px] text-[#8e8e93]">
              <div className="flex items-center gap-1.5 font-medium">
                <Eye className="w-4 h-4 text-[#8e8e93]" />
                <span>{post.views} visualizações</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{post.date}</span>
              </div>
            </div>
          </article>
        ))}

      </main>

      {/* ── BOTÃO FIXO INFERIOR: JUNTAR-SE / MUTAR ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 flex items-center justify-center">
        <div className="w-full max-w-[480px]">
          <button
            onClick={handleToggleJoin}
            className={`w-full h-[48px] rounded-full font-bold text-[15px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer border-none ${
              isJoined
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-[#3390ec] text-white hover:bg-[#2b7bc9]'
            }`}
          >
            {isJoined ? (
              <>
                <Check className="w-5 h-5 text-emerald-600" />
                <span>Inscrito no Canal Oficial</span>
              </>
            ) : (
              <>
                <Megaphone className="w-5 h-5" />
                <span>Juntar-se ao Canal de Anúncios</span>
              </>
            )}
          </button>
        </div>
      </footer>

    </div>
  );
}
