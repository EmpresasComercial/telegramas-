import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MoreVertical, 
  Smile, 
  Paperclip, 
  Bell, 
  BellOff, 
  Camera, 
  Share2, 
  Eye, 
  Send,
  CheckCheck
} from 'lucide-react';
import { useToast } from '../components/Toast';

interface ChannelPost {
  id: string;
  forwardedFrom?: {
    name: string;
    avatar?: string;
  };
  title?: string;
  content: string;
  image?: string;
  time: string;
  views: string;
  reactions: {
    emoji: string;
    count: number;
    userReacted: boolean;
  }[];
}

const INITIAL_POSTS: ChannelPost[] = [
  {
    id: 'post-1',
    content: `para criar campanhas, atividades, parcerias e novas oportunidades dentro da plataforma.\n\nQueremos que empresas, criadores, parceiros e utilizadores possam fazer parte desse crescimento.\n\nESTA É A MANEIRA DA ASIARAY MÍDIA.`,
    time: '14:44',
    views: '1',
    reactions: [
      { emoji: '❤️', count: 1, userReacted: true }
    ]
  },
  {
    id: 'post-2',
    forwardedFrom: {
      name: 'Channel Asiaray Angola - Gestão...',
      avatar: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=80&h=80&fit=crop'
    },
    image: '/tutorial_retirada.png',
    title: 'Como fazer uma retirada?',
    content: `Clique em "Retirar", digite o valor desejado, escolha AOA ou USDT e clique em "Confirmar".`,
    time: '14:44',
    views: '1',
    reactions: [
      { emoji: '❤️', count: 1, userReacted: true }
    ]
  },
  {
    id: 'post-3',
    forwardedFrom: {
      name: 'Telegram Business News Oficial',
      avatar: '/telegram business_logo_icon_167892.webp'
    },
    title: '🌟 Lançamento Oficial do Sistema Telegram Stars!',
    content: `Temos o prazer de anunciar o lançamento do novo sistema Telegram Stars na nossa aplicação!\n\nAgora você pode adquirir pacotes de Estrelas digitais para ativação rápida de Bots e serviços na plataforma, com liquidação instantânea.\n\nAcesse a seção de Estrelas no topo da página ou pelo menu lateral para conferir todos os benefícios!`,
    time: '15:10',
    views: '12.8K',
    reactions: [
      { emoji: '🔥', count: 42, userReacted: false },
      { emoji: '👍', count: 89, userReacted: true }
    ]
  }
];

export default function OfficialChannel() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<ChannelPost[]>(INITIAL_POSTS);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [subscribersCount] = useState('1 inscrito');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleToggleReaction = (postId: string, emojiIndex: number) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const updatedReactions = [...p.reactions];
      const r = updatedReactions[emojiIndex];
      if (r.userReacted) {
        r.count = Math.max(0, r.count - 1);
        r.userReacted = false;
      } else {
        r.count += 1;
        r.userReacted = true;
      }
      return { ...p, reactions: updatedReactions };
    }));
  };

  const handleForwardPost = (post: ChannelPost) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${post.title ? post.title + '\n\n' : ''}${post.content}`);
    }
    showToast('Link e conteúdo do post copiados para encaminhar!', 'success');
  };

  const handleSendBroadcast = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    const newPost: ChannelPost = {
      id: `post-${Date.now()}`,
      content: inputText.trim(),
      time: timeStr,
      views: '1',
      reactions: [
        { emoji: '❤️', count: 1, userReacted: true }
      ]
    };

    setPosts(prev => [...prev, newPost]);
    setInputText('');
    showToast('Publicação transmitida no canal!', 'success');

    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  return (
    <div className="w-full h-[100dvh] font-sans antialiased text-[#111827] select-none flex flex-col items-center overflow-hidden relative tg-wallpaper transition-colors">

      {/* ── HEADER IDÊNTICO AO TELEGRAM REAL ── */}
      <header className="w-full bg-white dark:bg-[#242f3d] text-gray-900 dark:text-white px-2 py-2 sticky top-0 z-40 flex items-center justify-between shadow-xs select-none border-b border-gray-200/60 dark:border-[#17212b]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate('/telegramBussiness')}
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 active:bg-gray-200 dark:active:bg-white/20 transition-colors cursor-pointer shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Avatar Oficial Telegram (círculo azul com avião de papel) */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-[#2481cc] flex items-center justify-center shadow-xs overflow-hidden">
              <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[24px] h-[24px]">
                <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232" />
                <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035" />
                <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[16px] font-bold text-[#111827] dark:text-white tracking-tight truncate leading-tight">
                Telegram Updates
              </h1>
              <span className="w-4 h-4 rounded-full bg-[#2481cc] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                ✓
              </span>
            </div>
            <span className="text-[12px] text-gray-500 dark:text-gray-400 font-normal leading-tight">
              {subscribersCount}
            </span>
          </div>
        </div>

        {/* Três pontinhos verticais */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => showToast('Canal oficial de transmissão pública', 'info')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 active:bg-gray-200 dark:active:bg-white/20 transition-colors cursor-pointer"
            title="Mais Opções"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── FEED DE POSTAGENS DO CANAL (BALÕES NATIVOS) ── */}
      <main
        ref={scrollRef}
        className="w-full max-w-[650px] flex-1 overflow-y-auto no-scrollbar px-3 pt-3 pb-24 space-y-3 relative"
      >
        {posts.map((post) => (
          <div key={post.id} className="flex items-end justify-start gap-2 relative">
            
            {/* Balão Branco do Post Telegram */}
            <div className="max-w-[88%] sm:max-w-[82%] bg-white dark:bg-[#182533] rounded-[16px] rounded-tl-[4px] px-3.5 pt-3 pb-2 shadow-[0_1px_2px_rgba(0,0,0,0.08)] border border-black/5 dark:border-white/5 relative">
              
              {/* Cabeçalho de Encaminhado */}
              {post.forwardedFrom && (
                <div className="mb-2">
                  <span className="text-[12px] font-normal text-[#e67e22] dark:text-[#f39c12] block leading-tight">
                    Encaminhado de
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {post.forwardedFrom.avatar ? (
                      <img 
                        src={post.forwardedFrom.avatar} 
                        alt="Avatar do Canal"
                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-orange-200"
                        onError={(e) => {
                          (e.target as any).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=80&h=80&fit=crop";
                        }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                        📢
                      </div>
                    )}
                    <span className="text-[13.5px] font-bold text-[#e67e22] dark:text-[#f39c12] truncate">
                      {post.forwardedFrom.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Imagem do Post (se houver) */}
              {post.image && (
                <div className="mb-2.5 -mx-1.5 rounded-[12px] overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#101921]">
                  <img
                    src={post.image}
                    alt={post.title || "Post anexo"}
                    className="w-full h-auto max-h-[300px] object-contain rounded-[12px]"
                    onError={(e) => {
                      (e.target as any).src = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=350&fit=crop";
                    }}
                  />
                </div>
              )}

              {/* Título do Post (se houver) */}
              {post.title && (
                <h2 className="text-[15.5px] font-bold text-[#111827] dark:text-white mb-1 leading-snug">
                  {post.title}
                </h2>
              )}

              {/* Conteúdo do Post */}
              <p className="text-[14.5px] text-[#111827] dark:text-[#f3f4f6] leading-relaxed break-words whitespace-pre-line font-normal pr-14">
                {post.content}
              </p>

              {/* Rodapé da Mensagem: Reações no canto esquerdo + Visualizações e Hora no canto direito */}
              <div className="flex items-center justify-between mt-2 pt-1">
                
                {/* Pílulas de Reação (ex: ❤️ 1) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {post.reactions.map((r, i) => (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => handleToggleReaction(post.id, i)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer select-none active:scale-95 ${
                        r.userReacted
                          ? 'bg-[#2481cc]/15 text-[#2481cc] dark:bg-[#2481cc]/30 dark:text-[#64b5f6]'
                          : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                      }`}
                    >
                      <span className="text-[13px] leading-none">{r.emoji}</span>
                      <span>{r.count}</span>
                    </button>
                  ))}
                </div>

                {/* Visualizações e Horário Telegram */}
                <div className="flex items-center gap-1 text-[11px] text-[#8e8e93] dark:text-[#8e9aa5] select-none ml-auto shrink-0 pl-2">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{post.views}</span>
                  <span className="ml-1">{post.time}</span>
                </div>
              </div>
            </div>

            {/* Botão de Encaminhar Rápido (Quick Share) flutuando ao lado do balão */}
            <button
              type="button"
              onClick={() => handleForwardPost(post)}
              className="w-8 h-8 rounded-full bg-white/70 dark:bg-[#242f3d]/70 backdrop-blur-xs hover:bg-white dark:hover:bg-[#242f3d] flex items-center justify-center text-[#2481cc] shadow-xs active:scale-90 transition-transform cursor-pointer shrink-0 mb-1"
              title="Encaminhar post"
              aria-label="Encaminhar post"
            >
              <Share2 className="w-4 h-4 -scale-x-100" />
            </button>
          </div>
        ))}
      </main>

      {/* ── BARRA INFERIOR IDÊNTICA AO PRINT (TRANSMITIR / SINO / CLIP / CÂMERA) ── */}
      <footer className="fixed bottom-0 left-0 right-0 p-2 z-40 flex justify-center bg-white/95 dark:bg-[#17212b]/95 backdrop-blur-sm border-t border-gray-200/60 dark:border-[#202b36]">
        <div className="w-full max-w-[650px] flex items-center gap-2">
          
          {/* Caixa de Entrada com Smile + Transmitir + Sino + Anexo */}
          <div className="flex-1 bg-white dark:bg-[#202b36] rounded-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center px-3 py-1 min-h-[46px] border border-gray-200 dark:border-gray-700">
            
            {/* Ícone Smile/Emoji */}
            <button 
              type="button" 
              onClick={() => showToast('Selecione emojis para incluir na transmissão', 'info')}
              className="text-[#707579] hover:text-[#2481cc] p-1.5 active:scale-90 transition-transform shrink-0"
              title="Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Campo Transmitir */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendBroadcast();
              }}
              placeholder="Transmitir"
              className="w-full px-2 py-1.5 text-[15px] bg-transparent outline-none text-black dark:text-white placeholder:text-gray-400 font-normal leading-snug"
            />

            {/* Botão de Notificação / Sino (Mutar/Desmutar) */}
            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                showToast(isMuted ? 'Notificações com som ativadas' : 'Notificações em silêncio ativadas', 'info');
              }}
              className={`p-1.5 active:scale-90 transition-transform shrink-0 ${
                isMuted ? 'text-[#e53e3e]' : 'text-[#707579] hover:text-[#2481cc]'
              }`}
              title={isMuted ? "Canal silencioso" : "Canal com som"}
            >
              {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </button>

            {/* Botão Anexo */}
            <button
              type="button"
              onClick={() => showToast('Selecione uma imagem ou mídia para transmitir', 'info')}
              className="text-[#707579] hover:text-[#2481cc] p-1.5 active:scale-90 transition-transform shrink-0"
              title="Anexar arquivo"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Botão Circular Azul Telegram (Câmera ou Enviar) */}
          <button
            type="button"
            onClick={() => {
              if (inputText.trim()) {
                handleSendBroadcast();
              } else {
                showToast('Gravação de vídeo/áudio instantâneo', 'info');
              }
            }}
            className="w-[46px] h-[46px] rounded-full text-white bg-[#2481cc] hover:bg-[#1f72b5] flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_8px_rgba(36,129,204,0.35)] cursor-pointer"
            title={inputText.trim() ? "Transmitir Mensagem" : "Gravação Instantânea"}
          >
            {inputText.trim() ? (
              <Send className="w-5 h-5 text-white ml-0.5" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </footer>

    </div>
  );
}
