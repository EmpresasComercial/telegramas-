import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Send, CheckCheck, Loader2 } from 'lucide-react';
import { useToast } from '../components/Toast';

export default function PrivateChat() {
  const { contactId } = useParams();
  const [searchParams] = useSearchParams();
  const rawContactPhone = searchParams.get('t') || 'Contacto';
  
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();

  // Nome de exibição do contacto — nome definido ou telefone completo
  const [contactDisplayName, setContactDisplayName] = useState(rawContactPhone);

  const localKey = user && contactId ? `private_chat_${user.id}_${contactId}` : null;

  // Carregamento instantâneo em 0ms do cache local
  const [messages, setMessages] = useState<any[]>(() => {
    if (localKey) {
      try {
        const cached = localStorage.getItem(localKey);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(() => messages.length === 0);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        .from('mensagens_privadas')
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

          if (prev.length === combined.length) {
            let unchanged = true;
            for (let i = 0; i < combined.length; i++) {
              if (
                prev[i]?.id !== combined[i]?.id ||
                prev[i]?.mensagem !== combined[i]?.mensagem
              ) {
                unchanged = false;
                break;
              }
            }
            if (unchanged) return prev;
          }

          if (localKey) {
            try { localStorage.setItem(localKey, JSON.stringify(combined)); } catch {}
          }
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
    fetchMessages(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMessages(false);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [user, contactId]);

  // Busca o nome de exibição do contacto (nome_exibicao ou telefone sem máscara)
  useEffect(() => {
    if (!contactId) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('perfis_mcpn')
          .select('nome_exibicao, telefone')
          .eq('id', contactId)
          .single();
        if (data) {
          setContactDisplayName(data.nome_exibicao?.trim() || data.telefone || rawContactPhone);
        }
      } catch { /* silencia */ }
    })();
  }, [contactId]);

  useEffect(() => {
    if (!user || !contactId) return;

    // Supabase Realtime Subscription
    try {
      const channel = supabase.channel(`private_chat_${user.id}_${contactId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'mensagens_privadas'
        }, (payload: any) => {
          const newM = payload.new;
          if (
            (newM.remetente_id === contactId && newM.destinatario_id === user.id) ||
            (newM.remetente_id === user.id && newM.destinatario_id === contactId)
          ) {
            setMessages(prev => {
              if (prev.find(m => String(m.id) === String(newM.id))) return prev;
              const updated = [...prev, newM];
              if (localKey) {
                try { localStorage.setItem(localKey, JSON.stringify(updated)); } catch {}
              }
              return updated;
            });
            scrollToBottom();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {}
  }, [user, contactId]);

  const handleSend = async () => {
    if (!user || !contactId || !inputText.trim()) return;

    const msg = inputText.trim();
    setInputText("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }

    const tempId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg = {
      id: tempId,
      remetente_id: user.id,
      destinatario_id: contactId,
      mensagem: msg,
      lida: false,
      created_at: new Date().toISOString()
    };

    // Atualização Otimista Imediata Instantânea (0ms no ecrã)
    setMessages(prev => {
      const next = [...prev, newMsg];
      if (localKey) {
        try { localStorage.setItem(localKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
    scrollToBottom();

    try {
      const { data, error } = await (supabase as any)
        .from('mensagens_privadas')
        .insert([{
          remetente_id: user.id,
          destinatario_id: contactId,
          mensagem: msg,
          lida: false
        }])
        .select()
        .single();

      if (!error && data) {
        setMessages(prev => {
          const updated = prev.map(m => m.id === tempId ? data : m);
          if (localKey) {
            try { localStorage.setItem(localKey, JSON.stringify(updated)); } catch {}
          }
          return updated;
        });
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

  return (
    <div className="w-full h-[100dvh] bg-[#9bb88a] font-sans antialiased text-[#202020] select-none flex flex-col items-center overflow-hidden relative">
      
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(#5a7a49 1px, transparent 1px), radial-gradient(#5a7a49 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }}
      />

      {/* HEADER */}
      <header className="w-full max-w-[480px] px-2 py-2 sticky top-0 z-30 flex items-center bg-white shadow-sm">
        <button 
          onClick={() => navigate('/telegramBussiness')} 
          className="p-2 rounded-full text-[#202020] active:bg-gray-100 transition-colors cursor-pointer shrink-0"
          aria-label="Voltar aos chats"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>

          <div className="flex items-center gap-3 flex-1 px-1">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-xs"
            style={{ backgroundColor: contactColor }}
          >
            {contactDisplayName === 'Patrocinador' ? 'P' : contactDisplayName === 'Membro' ? 'M' : contactDisplayName.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-[16px] font-semibold text-[#202020] tracking-tight truncate leading-tight">
              {contactDisplayName}
            </h1>
            <span className="text-[12.5px] text-[#229ED9] font-normal leading-tight">
              online
            </span>
          </div>
        </div>
      </header>

      {/* CHAT MESSAGES AREA */}
      <main 
        ref={scrollRef}
        className="w-full max-w-[480px] flex-1 overflow-y-auto no-scrollbar px-3 pt-4 pb-20 space-y-3 relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {isLoading && messages.length === 0 && (
          <div className="flex justify-center my-4">
            <div className="w-6 h-6 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="flex justify-center my-8">
            <div className="bg-black/20 text-white text-[13px] px-4 py-1.5 rounded-full backdrop-blur-xs text-center shadow-xs">
              Nenhuma mensagem ainda. Diga olá! 👋
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.remetente_id === user?.id;

          return (
            <div 
              key={m.id}
              className={`flex items-end gap-1.5 ${isMe ? "justify-end" : "justify-start"} relative`}
            >
              <div
                className={`max-w-[82%] px-3.5 py-2 text-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.06)] relative select-text ${
                  isMe 
                    ? "bg-[#dcf8c6] rounded-[18px] rounded-br-[4px]" 
                    : "bg-white rounded-[18px] rounded-bl-[4px]"
                }`}
              >
                <div className="relative">
                  <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap pr-12 text-[#202020] font-normal">
                    {m.mensagem}
                  </p>
                  
                  <div className="absolute right-0 bottom-[-2px] flex items-center gap-0.5 select-none">
                    <span className={`text-[10.5px] font-normal ${isMe ? 'text-[#55864e]' : 'text-[#8e8e93]'}`}>
                      {formatTime(m.created_at)}
                    </span>
                    {isMe && (
                      <CheckCheck className={`w-3.5 h-3.5 stroke-[2.4] ${m.lida ? 'text-[#4fae4e]' : 'text-[#55864e]/60'}`} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* BOTTOM INPUT BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-2 z-40 flex justify-center bg-[#9bb88a]">
        <div className="w-full max-w-[480px] flex items-end gap-2">
          
          <div className="flex-1 bg-white rounded-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center px-3.5 py-1 min-h-[46px] border border-gray-100/80">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
              }}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleSend(); 
                } 
              }}
              placeholder="Message"
              className="w-full px-1 py-2 text-[16px] bg-transparent resize-none outline-none max-h-[100px] text-black placeholder:text-gray-400 font-normal leading-snug"
              rows={1}
            />
          </div>

          <button 
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`w-[46px] h-[46px] rounded-full text-white flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_8px_rgba(37,211,102,0.4)] ${
              (inputText.trim()) ? 'bg-[#25D366] cursor-pointer' : 'bg-[#25D366]/60 cursor-default'
            }`}
            title="Enviar"
          >
            <Send className="w-5 h-5 text-white ml-0.5 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
