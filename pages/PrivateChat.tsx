import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChevronLeft, 
  Send, 
  CheckCheck, 
  Loader2, 
  Phone, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Mic,
  Zap,
  Reply,
  Copy,
  Pencil,
  Trash2,
  X,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../components/Toast';

// ── Tipos ──────────────────────────────────────────────────────────────
interface Message {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  reaction?: string;
}

interface ContextMenu {
  message: Message;
  x: number;
  y: number;
  isMe: boolean;
}

// ── Constantes de Emojis Oficiais Telegram ────────────────────────────
const QUICK_REACTIONS = ['❤️', '🫡', '🤷‍♂️', '👍', '👎', '🔥', '🥰', '🎉', '👏', '😂', '😮', '😢'];

// ── Componente Principal ───────────────────────────────────────────────
export default function PrivateChat() {
  const { contactId } = useParams();
  const [searchParams] = useSearchParams();
  const rawContactPhone = searchParams.get('t') || 'Contacto';
  
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();

  const [contactDisplayName, setContactDisplayName] = useState(rawContactPhone);
  const localKey = user && contactId ? `private_chat_${user.id}_${contactId}` : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showQuickHints, setShowQuickHints] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [showAllReactions, setShowAllReactions] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Quick Replies ─────────────────────────────────────────────────────
  const quickReplies = [
    { shortcut: '/ola', text: 'Olá! Como posso ser útil hoje no Telegram Business?' },
    { shortcut: '/estrelas', text: 'Você pode adquirir e resgatar Telegram Stars na aba Stars e Carteira com liquidação instantânea.' },
    { shortcut: '/suporte', text: 'Nosso atendimento oficial está disponível 24 horas por dia, 7 dias por semana.' },
    { shortcut: '/plano', text: 'Consulte os bots de rendimento e ferramentas VIP na aba Bots & Planos.' },
  ];

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        if (behavior === 'auto') {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else {
          scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
      }
    });
  };

  // ── Fetch Messages ────────────────────────────────────────────────────
  const fetchMessages = async (isInitial = false) => {
    if (!user || !contactId) return;
    try {
      const { data, error } = await (supabase as any)
        .from('sys_t110')
        .select('*')
        .or(`and(remetente_id.eq.${user.id},destinatario_id.eq.${contactId}),and(remetente_id.eq.${contactId},destinatario_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(150);

      if (!error && data) {
        setMessages(prev => {
          const msgMap = new Map<string, any>();
          prev.forEach(m => msgMap.set(String(m.id), m));
          data.forEach((m: any) => msgMap.set(String(m.id), m));
          return Array.from(msgMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        if (isInitial) scrollToBottom('auto');
      }
    } catch {
      // silent
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (localKey) {
      try { localStorage.removeItem(localKey); } catch {}
    }
    fetchMessages(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchMessages(false);
    }, 2500);
    return () => clearInterval(interval);
  }, [user, contactId]);

  // Busca telefone do contacto
  useEffect(() => {
    if (!contactId || contactId.startsWith('pavel')) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('sys_t500')
          .select('telefone')
          .eq('id', contactId)
          .single();
        if (data?.telefone) setContactDisplayName(data.telefone);
      } catch {}
    })();
  }, [contactId]);

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick as any);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick as any);
    };
  }, [contextMenu]);

  // ── Context Menu Helpers ──────────────────────────────────────────────
  const openContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent, message: Message, isMe: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAllReactions(false);
    setContextMenu({ message, x: 0, y: 0, isMe });
  }, []);

  const closeContextMenu = () => {
    setContextMenu(null);
    setShowAllReactions(false);
  };

  const handleReaction = (emoji: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === contextMenu?.message.id
          ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
          : m
      )
    );
    showToast(`Reação ${emoji} adicionada!`, 'success');
    closeContextMenu();
  };

  const handleReply = () => {
    if (contextMenu) {
      setReplyTo(contextMenu.message);
      closeContextMenu();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopy = () => {
    if (contextMenu) {
      navigator.clipboard.writeText(contextMenu.message.mensagem).catch(() => {});
      showToast('Mensagem copiada!', 'success');
      closeContextMenu();
    }
  };

  const handleDelete = () => {
    if (contextMenu) {
      setMessages(prev => prev.filter(m => m.id !== contextMenu.message.id));
      showToast('Mensagem apagada', 'info');
      closeContextMenu();
    }
  };

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent, message: Message, isMe: boolean) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartRef.current.y);
    const duration = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Se o dedo moveu menos de 12px e durou menos de 600ms, é um toque/tap genuíno
    if (diffX < 12 && diffY < 12 && duration < 600) {
      e.preventDefault();
      openContextMenu(e, message, isMe);
    }
  };

  // ── Send Message ──────────────────────────────────────────────────────
  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || !user || !contactId || isSending) return;

    const msg = textToSend.trim();
    setInputText('');
    setShowQuickHints(false);
    setReplyTo(null);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: Message = {
      id: tempId,
      remetente_id: user.id,
      destinatario_id: contactId,
      mensagem: msg,
      lida: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    scrollToBottom();

    if (contactId.startsWith('pavel') || contactId.includes('suporte')) {
      setTimeout(() => {
        const autoReply: Message = {
          id: `auto_${Date.now()}`,
          remetente_id: contactId,
          destinatario_id: user.id,
          mensagem: 'Obrigado pela sua mensagem! O Telegram Business está ativo para impulsionar suas operações e conexões em tempo real. Se precisar de assistência financeira com Stars, consulte a aba de Carteira.',
          lida: true,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, autoReply]);
        scrollToBottom();
      }, 900);
    }

    try {
      const { data, error } = await (supabase as any)
        .from('sys_t110')
        .insert([{ remetente_id: user.id, destinatario_id: contactId, mensagem: msg, detalhes: { lida: false } }])
        .select()
        .single();
      if (!error && data) {
        setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      }
    } catch (err: any) {
      console.warn('Mensagem salva localmente:', err?.message || err);
    }
  };

  // ── Helpers de Formatação ─────────────────────────────────────────────
  const formatTime = (ts: string) =>
    ts ? new Date(ts).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';

  const getUserColor = (str: string) => {
    const colors = ['#229ED9', '#E56555', '#8E44AD', '#27AE60', '#D35400', '#16A085', '#C0392B', '#2980B9'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const contactColor = getUserColor(contactDisplayName);
  const isPavel = contactId?.startsWith('pavel');

  // ── Ações do menu de contexto ─────────────────────────────────────────
  const menuActions = contextMenu ? [
    { icon: Reply, label: 'Responder', onClick: handleReply, color: '#2481cc' },
    { icon: Copy, label: 'Copiar', onClick: handleCopy, color: '#555' },
    ...(contextMenu.isMe ? [{ icon: Pencil, label: 'Editar', onClick: () => { showToast('Edição em breve', 'info'); closeContextMenu(); }, color: '#555' }] : []),
    { icon: Trash2, label: 'Apagar', onClick: handleDelete, color: '#e53e3e', subLabel: 'Autoexcluirá em 31 dias' },
  ] : [];

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-[100dvh] font-sans antialiased text-[#202020] select-none flex flex-col items-stretch overflow-hidden relative tg-wallpaper transition-colors">

      {/* ── HEADER ── */}
      <header className="w-full bg-[#517da2] dark:bg-[#242f3d] text-white px-3 sm:px-6 py-2 sticky top-0 z-40 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => navigate('/telegramBussiness')}
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer shrink-0"
            aria-label="Voltar aos chats"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>

          <div className="relative shrink-0">
            {isPavel ? (
              <img
                src="/pavel_durov.jpg"
                alt="Pavel Durov"
                className="w-10 h-10 rounded-full object-cover border border-white/40"
                onError={(e) => { (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'; }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-xs text-sm border border-white/30"
                style={{ backgroundColor: contactColor }}
              >
                {contactDisplayName.slice(0, 2).toUpperCase() || '?'}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#517da2] dark:border-[#242f3d]" />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h1 className="text-[15.5px] font-semibold text-white tracking-tight truncate leading-tight">
                {isPavel ? 'Pavel Durov' : contactDisplayName}
              </h1>
              {isPavel && (
                <span className="w-3.5 h-3.5 rounded-full bg-white text-[#2481cc] flex items-center justify-center text-[8px] font-black shrink-0">✓</span>
              )}
            </div>
            <span className="text-[12px] text-white/80 font-normal leading-tight">online</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => showToast('Iniciando chamada de voz segura...', 'info')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => showToast('Opções do chat Telegram', 'info')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── ÁREA DE MENSAGENS TELEGRAM (LARGURA TOTAL FLUIDA) ── */}
      <main
        ref={scrollRef}
        className="w-full flex-1 overflow-y-auto no-scrollbar px-3 sm:px-6 md:px-10 lg:px-16 pt-4 pb-24 space-y-2.5 relative scroll-smooth"
        onClick={() => contextMenu && closeContextMenu()}
      >
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center my-4">
            <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="flex justify-center my-4">
          <div className="bg-black/30 dark:bg-black/50 text-white text-[12px] px-4 py-1.5 rounded-full backdrop-blur-xs text-center shadow-xs">
            🔒 Mensagens criptografadas de ponta a ponta
          </div>
        </div>

        {messages.map((m) => {
          const isMe = m.remetente_id === user?.id;
          return (
            <div
              key={m.id}
              className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'} relative`}
            >
              <div className="relative">
                {/* Reação existente */}
                {m.reaction && (
                  <div
                    className={`absolute -bottom-3 ${isMe ? 'left-0' : 'right-0'} z-10 text-[16px] leading-none select-none`}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                  >
                    {m.reaction}
                  </div>
                )}

                {/* Balão da mensagem com detecção de toque instantânea */}
                <div
                  onClick={(e) => { e.stopPropagation(); openContextMenu(e, m, isMe); }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, m, isMe)}
                  className={`max-w-[85%] sm:max-w-[70%] md:max-w-[580px] px-3.5 py-2 text-[#111827] dark:text-[#f3f4f6] shadow-[0_1px_2px_rgba(16,35,47,0.15)] relative cursor-pointer active:brightness-95 active:scale-[0.985] transition-all select-none ${
                    isMe
                      ? 'bg-[#effdde] dark:bg-[#2b5278] rounded-[16px] rounded-br-[4px]'
                      : 'bg-white dark:bg-[#182533] rounded-[16px] rounded-bl-[4px]'
                  } ${contextMenu?.message.id === m.id ? 'brightness-90 scale-[0.985]' : ''}`}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="relative pointer-events-none">
                    {!isMe && (
                      <span
                        className="text-[12px] font-bold block mb-0.5"
                        style={{ color: isPavel ? '#2481cc' : contactColor }}
                      >
                        {isPavel ? 'Pavel Durov' : contactDisplayName}
                      </span>
                    )}

                    <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap pr-12 font-normal">
                      {m.mensagem}
                    </p>

                    <div className="absolute right-0 bottom-[-2px] flex items-center gap-0.5 select-none">
                      <span className={`text-[10px] font-normal ${isMe ? 'text-[#2481cc] dark:text-white/70' : 'text-[#707579] dark:text-[#8e9aa5]'}`}>
                        {formatTime(m.created_at)}
                      </span>
                      {isMe && <CheckCheck className="w-3.5 h-3.5 stroke-[2.4] text-[#2481cc] dark:text-[#5288c1]" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Espaço extra para reações no final */}
        <div className="h-2" />
      </main>

      {/* ── CONTEXT MENU OVERLAY (TELEGRAM NATIVO) ── */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end items-center px-4 pb-6 bg-black/50 backdrop-blur-xs transition-opacity"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          onClick={closeContextMenu}
        >
          <div
            ref={menuRef}
            className="w-full max-w-[325px] flex flex-col gap-2 select-none"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              animation: 'slideUpMenu 0.18s cubic-bezier(0.16, 1, 0.3, 1) both',
              touchAction: 'manipulation'
            }}
          >
            {/* ── Barra Flutuante de Reações Telegram ── */}
            <div className="bg-white dark:bg-[#2b2b2b] rounded-2xl shadow-xl px-2.5 py-2 flex items-center justify-between border border-gray-100 dark:border-white/10">
              {(showAllReactions ? QUICK_REACTIONS : QUICK_REACTIONS.slice(0, 7)).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReaction(emoji)}
                  className="w-9 h-9 flex items-center justify-center text-[24px] leading-none active:scale-130 transition-transform hover:scale-110 rounded-full select-none cursor-pointer"
                  style={{ touchAction: 'manipulation' }}
                  title={`Reagir com ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAllReactions(!showAllReactions)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-[#3a3a3a] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 active:scale-90 transition-transform cursor-pointer"
                style={{ touchAction: 'manipulation' }}
                title="Mais reações"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* ── Lista de Ações Essenciais ── */}
            <div className="bg-white dark:bg-[#2b2b2b] rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-white/10">
              {menuActions.map((action, idx) => (
                <React.Fragment key={action.label}>
                  <button
                    type="button"
                    onClick={action.onClick}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-[#333] active:bg-gray-100 dark:active:bg-[#3a3a3a] transition-colors cursor-pointer select-none text-left"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="flex items-center gap-3.5">
                      <action.icon
                        className="w-5 h-5 shrink-0"
                        style={{ color: action.color }}
                      />
                      <div>
                        <span
                          className="text-[15px] font-semibold block leading-tight text-gray-900 dark:text-gray-100"
                          style={{ color: action.color === '#e53e3e' ? '#e53e3e' : undefined }}
                        >
                          {action.label}
                        </span>
                        {action.subLabel && (
                          <span className="text-[11px] text-gray-400 block mt-0.5">{action.subLabel}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {idx < menuActions.length - 1 && (
                    <div className="h-px bg-gray-100 dark:bg-[#383838] mx-4" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Botão Cancelar */}
            <button
              type="button"
              onClick={closeContextMenu}
              className="w-full bg-white dark:bg-[#2b2b2b] rounded-2xl shadow-lg py-3 text-[15.5px] font-semibold text-[#2481cc] hover:bg-gray-50 dark:hover:bg-[#333] active:scale-[0.99] transition-all cursor-pointer border border-gray-100 dark:border-white/10 select-none text-center"
              style={{ touchAction: 'manipulation' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── REPLY PREVIEW BAR ── */}
      {replyTo && (
        <div className="fixed bottom-[65px] left-0 right-0 z-40 flex justify-center px-2 sm:px-6">
          <div className="w-full max-w-[1000px] bg-white dark:bg-[#17212b] border-t-2 border-[#2481cc] rounded-t-xl px-4 py-2.5 flex items-center gap-3 shadow-lg">
            <div className="w-[3px] h-full bg-[#2481cc] rounded-full self-stretch" />
            <div className="flex-1 min-w-0">
              <span className="text-[11.5px] font-bold text-[#2481cc] block">Respondendo a</span>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">{replyTo.mensagem}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── QUICK HINTS ── */}
      {showQuickHints && (
        <div className="fixed bottom-[65px] left-0 right-0 flex justify-center px-2 sm:px-6 z-40 animate-in slide-in-from-bottom-2">
          <div className="w-full max-w-[1000px] bg-white dark:bg-[#17212b] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-2 space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11.5px] font-semibold text-[#2481cc] uppercase">
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Respostas Rápidas (Telegram Business)</span>
              <button onClick={() => setShowQuickHints(false)} className="text-gray-400 hover:text-black dark:hover:text-white">✕</button>
            </div>
            {quickReplies.map((qr) => (
              <button
                key={qr.shortcut}
                onClick={() => handleSend(qr.text)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-[#242f3d] rounded-lg transition-colors flex items-center justify-between text-xs"
              >
                <span className="font-mono font-bold text-[#2481cc]">{qr.shortcut}</span>
                <span className="text-gray-600 dark:text-gray-300 truncate max-w-[70%]">{qr.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── BARRA DE MENSAGEM ── */}
      <div className="fixed bottom-0 left-0 right-0 p-2 sm:p-3 z-40 flex justify-center bg-white/90 dark:bg-[#17212b]/90 backdrop-blur-sm border-t border-gray-200/50 dark:border-[#202b36]">
        <div className="w-full max-w-[1000px] flex items-end gap-2 px-1 sm:px-4">
          <div className="flex-1 bg-white dark:bg-[#202b36] rounded-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center px-3.5 py-1 min-h-[46px] border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowQuickHints(!showQuickHints)}
              className="text-[#707579] hover:text-[#2481cc] p-1 active:scale-90 transition-transform shrink-0"
            >
              <Smile className="w-5 h-5" />
            </button>

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => {
                const val = e.target.value;
                setInputText(val);
                if (val.startsWith('/')) setShowQuickHints(true);
                else if (showQuickHints) setShowQuickHints(false);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={replyTo ? 'Escreva uma resposta...' : 'Mensagem...'}
              className="w-full px-2 py-2 text-[15px] bg-transparent resize-none outline-none max-h-[100px] text-black dark:text-white placeholder:text-gray-400 font-normal leading-snug"
              rows={1}
            />

            <button
              type="button"
              onClick={() => showToast('Selecione uma imagem ou documento', 'info')}
              className="text-[#707579] hover:text-[#2481cc] p-1 active:scale-90 transition-transform shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className={`w-[46px] h-[46px] rounded-full text-white flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_10px_rgba(36,129,204,0.4)] ${
              inputText.trim() ? 'bg-[#2481cc] hover:bg-[#1f72b5] cursor-pointer' : 'bg-[#50a2e9] cursor-pointer'
            }`}
          >
            {inputText.trim() ? <Send className="w-5 h-5 text-white ml-0.5" /> : <Mic className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* ── Animações CSS injetadas ── */}
      <style>{`
        @keyframes slideUpMenu {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes reactionIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1);   }
        }
      `}</style>
    </div>
  );
}
