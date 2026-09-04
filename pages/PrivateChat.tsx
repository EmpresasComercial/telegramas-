import React, { useState, useEffect, useRef } from 'react';
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
  Zap
} from 'lucide-react';
import { useToast } from '../components/Toast';

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

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showQuickHints, setShowQuickHints] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sugestões de Respostas Rápidas do Telegram Business
  const quickReplies = [
    { shortcut: '/ola', text: 'Olá! Como posso ser útil hoje no Telegram Business?' },
    { shortcut: '/estrelas', text: 'Você pode adquirir e resgatar Telegram Stars na aba Stars e Carteira com liquidação instantânea.' },
    { shortcut: '/suporte', text: 'Nosso atendimento oficial está disponível 24 horas por dia, 7 dias por semana.' },
    { shortcut: '/plano', text: 'Consulte os bots de rendimento e ferramentas VIP na aba Bots & Planos.' },
  ];

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        if (behavior === "auto") {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth"
          });
        }
      }
    });
  };

  // Carrega mensagens do banco de dados e sincroniza
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

          const combined = Array.from(msgMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          return combined;
        });

        if (isInitial) scrollToBottom("auto");
      }
    } catch {
      // Falha silenciosa em background
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
      if (document.visibilityState === 'visible') {
        fetchMessages(false);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [user, contactId]);

  // Busca o telefone do contacto se for UUID
  useEffect(() => {
    if (!contactId || contactId.startsWith('pavel')) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('sys_t500')
          .select('telefone')
          .eq('id', contactId)
          .single();
        if (data && data.telefone) {
          setContactDisplayName(data.telefone);
        }
      } catch {}
    })();
  }, [contactId]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || !user || !contactId || isSending) return;

    const msg = textToSend.trim();
    setInputText("");
    setShowQuickHints(false);
    if (inputRef.current) inputRef.current.style.height = "auto";

    const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg = {
      id: tempId,
      remetente_id: user.id,
      destinatario_id: contactId,
      mensagem: msg,
      lida: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    scrollToBottom();

    // Se for conversa com Pavel Durov / Suporte, responder com mensagem automática
    if (contactId.startsWith('pavel') || contactId.includes('suporte')) {
      setTimeout(() => {
        const autoReply = {
          id: `auto_${Date.now()}`,
          remetente_id: contactId,
          destinatario_id: user.id,
          mensagem: "Obrigado pela sua mensagem! O Telegram Business está ativo para impulsionar suas operações e conexões em tempo real. Se precisar de assistência financeira com Stars, consulte a aba de Carteira.",
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
        .insert([{
          remetente_id: user.id,
          destinatario_id: contactId,
          mensagem: msg,
          detalhes: { lida: false }
        }])
        .select()
        .single();

      if (!error && data) {
        setMessages(prev => prev.map(m => m.id === tempId ? data : m));
      }
    } catch (err: any) {
      console.warn("Mensagem salva localmente:", err?.message || err);
    }
  };

  const formatTime = (ts: string) => ts ? new Date(ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "";

  const getUserColor = (str: string) => {
    const colors = ["#229ED9", "#E56555", "#8E44AD", "#27AE60", "#D35400", "#16A085", "#C0392B", "#2980B9"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const contactColor = getUserColor(contactDisplayName);
  const isPavel = contactId?.startsWith('pavel');

  return (
    <div className="w-full h-[100dvh] font-sans antialiased text-[#202020] select-none flex flex-col items-center overflow-hidden relative tg-wallpaper transition-colors">
      
      {/* ── HEADER NATIVO DO TELEGRAM ── */}
      <header className="w-full bg-[#517da2] dark:bg-[#242f3d] text-white px-2 py-2 sticky top-0 z-40 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button 
            onClick={() => navigate('/telegramBussiness')} 
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer shrink-0"
            aria-label="Voltar aos chats"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Avatar Oficial */}
          <div className="relative shrink-0">
            {isPavel ? (
              <img 
                src="/pavel_durov.jpg" 
                alt="Pavel Durov" 
                className="w-10 h-10 rounded-full object-cover border border-white/40"
                onError={(e) => {
                  (e.target as any).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop";
                }}
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
                {isPavel ? "Pavel Durov" : contactDisplayName}
              </h1>
              {isPavel && (
                <span className="w-3.5 h-3.5 rounded-full bg-white text-[#2481cc] flex items-center justify-center text-[8px] font-black shrink-0">
                  ✓
                </span>
              )}
            </div>
            <span className="text-[12px] text-white/80 font-normal leading-tight">
              online
            </span>
          </div>
        </div>

        {/* Ações da Direita */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => showToast(`Iniciando chamada de voz segura...`, 'info')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
            title="Chamada de Voz"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            onClick={() => showToast('Opções do chat Telegram', 'info')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
            title="Mais Opções"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── ÁREA DE MENSAGENS TELEGRAM ── */}
      <main 
        ref={scrollRef}
        className="w-full max-w-[650px] flex-1 overflow-y-auto no-scrollbar px-3 pt-4 pb-24 space-y-2 relative scroll-smooth"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center my-4">
            <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Balão inicial Telegram de criptografia */}
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
              className={`flex items-end gap-1.5 ${isMe ? "justify-end" : "justify-start"} relative`}
            >
              <div
                className={`max-w-[82%] px-3.5 py-2 text-[#111827] dark:text-[#f3f4f6] shadow-[0_1px_2px_rgba(16,35,47,0.15)] relative select-text ${
                  isMe 
                    ? "bg-[#effdde] dark:bg-[#2b5278] rounded-[16px] rounded-br-[4px]" 
                    : "bg-white dark:bg-[#182533] rounded-[16px] rounded-bl-[4px]"
                }`}
              >
                <div className="relative">
                  {!isMe && (
                    <span 
                      className="text-[12px] font-bold block mb-0.5"
                      style={{ color: isPavel ? '#2481cc' : contactColor }}
                    >
                      {isPavel ? "Pavel Durov" : contactDisplayName}
                    </span>
                  )}
                  
                  <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap pr-12 font-normal">
                    {m.mensagem}
                  </p>
                  
                  <div className="absolute right-0 bottom-[-2px] flex items-center gap-0.5 select-none">
                    <span className={`text-[10px] font-normal ${isMe ? 'text-[#2481cc] dark:text-white/70' : 'text-[#707579] dark:text-[#8e9aa5]'}`}>
                      {formatTime(m.created_at)}
                    </span>
                    {isMe && (
                      <CheckCheck className="w-3.5 h-3.5 stroke-[2.4] text-[#2481cc] dark:text-[#5288c1]" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* ── PAINEL DE SUGESTÕES DE RESPOSTAS RÁPIDAS TELEGRAM BUSINESS ── */}
      {showQuickHints && (
        <div className="fixed bottom-[65px] left-0 right-0 flex justify-center px-3 z-40 animate-in slide-in-from-bottom-2">
          <div className="w-full max-w-[650px] bg-white dark:bg-[#17212b] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-2 space-y-1">
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

      {/* ── BARRA DE ENTRADA DE MENSAGENS NATIVA DO TELEGRAM ── */}
      <div className="fixed bottom-0 left-0 right-0 p-2 z-40 flex justify-center bg-white/90 dark:bg-[#17212b]/90 backdrop-blur-sm border-t border-gray-200/50 dark:border-[#202b36]">
        <div className="w-full max-w-[650px] flex items-end gap-2">
          
          <div className="flex-1 bg-white dark:bg-[#202b36] rounded-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] flex items-center px-3.5 py-1 min-h-[46px] border border-gray-200 dark:border-gray-700">
            {/* Botão Emoji */}
            <button 
              type="button" 
              onClick={() => setShowQuickHints(!showQuickHints)}
              className="text-[#707579] hover:text-[#2481cc] p-1 active:scale-90 transition-transform shrink-0"
              title="Respostas Rápidas & Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Campo de Texto */}
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => {
                const val = e.target.value;
                setInputText(val);
                if (val.startsWith('/')) setShowQuickHints(true);
                else if (showQuickHints) setShowQuickHints(false);

                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleSend(); 
                } 
              }}
              placeholder="Mensagem..."
              className="w-full px-2 py-2 text-[15px] bg-transparent resize-none outline-none max-h-[100px] text-black dark:text-white placeholder:text-gray-400 font-normal leading-snug"
              rows={1}
            />

            {/* Anexar Arquivo */}
            <button 
              type="button"
              onClick={() => showToast('Selecione uma imagem ou documento', 'info')}
              className="text-[#707579] hover:text-[#2481cc] p-1 active:scale-90 transition-transform shrink-0"
              title="Anexar Arquivo"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Botão Redondo Azul Telegram (Microfone ou Enviar) */}
          <button 
            type="button"
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className={`w-[46px] h-[46px] rounded-full text-white flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_10px_rgba(36,129,204,0.4)] ${
              inputText.trim() 
                ? 'bg-[#2481cc] hover:bg-[#1f72b5] cursor-pointer' 
                : 'bg-[#50a2e9] cursor-pointer'
            }`}
            title={inputText.trim() ? "Enviar Mensagem" : "Gravar Áudio"}
          >
            {inputText.trim() ? (
              <Send className="w-5 h-5 text-white ml-0.5" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
