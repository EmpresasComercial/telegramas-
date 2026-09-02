import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { useToast } from "../components/Toast";
import { cn } from "../lib/utils";
import { 
  ChevronLeft, 
  Paperclip, 
  Send, 
  X, 
  CheckCheck,
  MoreVertical,
  ArrowDown,
  Loader2,
  Download,
  Smile,
  Mic
} from 'lucide-react';

const FORBIDDEN_WORDS = Array.from(new Set([
  "burla", "burlas", "fraude", "fraudes", "scam", "scams", "golpe", "golpes", 
  "ladrão", "ladrao", "ladrões", "ladroes", "roubo", "roubos", "bosta", "bostas", 
  "merda", "merdas", "caralho", "caralhos", "foda", "fodas", "fodase", "foda-se", 
  "porra", "porras", "puta", "putas", "puta que pariu", "filho da puta", "fdp", 
  "cabrao", "cabrão", "cabroes", "cabrões", "corno", "cornos", "vagabundo", "vagabundos", 
  "desgraçado", "desgracado", "desgraçados", "animal", "animais", "idiota", "idiotas", 
  "imbecil", "imbecis", "otario", "otário", "otarios", "otários", "retardado", "retardados", 
  "estupido", "estúpido", "estupidos", "estúpidos", "palhaço", "palhaco", "palhaços", "palhacos", 
  "lixo", "lixos", "nojento", "nojentos", "maldito", "malditos", "cão", "cao", "macaco", "macacos", 
  "burro", "burros", "cala boca", "vai se ferrar", "vai te ferrar", "vai morrer", 
  "sexo", "nude", "nudes", "porn", "porno", "pornografia", "pênis", "penis", 
  "piroca", "pirocas", "cona", "conas", "vagina", "buceta", "bucetas", "cu", "cus", 
  "rabeta", "mamar", "chupar", "mata", "morrer", "suicida", "suicidio", "terrorista", "nazista", "racista", 
  "vou denunciar", "vou processar", "processo", "crime", "polícia", "policia", 
  "tribunal", "interpol", "cadeia", "prisão", "prisao", "fbi", "investigação", "investigacao", 
  "viado", "viados", "gayzinho", "bicha", "bichas", "boiola", "sapatão", "sapatao", 
  "golpista", "golpistas", "burlador", "burladores", "fraudador", "fraudadores", 
  "scammer", "scammers", "pirâmide", "piramide", "esquema ponzi", "ponzi", 
  "roubaram", "roubaste", "roubado", "roubando", "empresa falsa", "site falso", 
  "aplicativo falso", "app falso", "fake", "farsa", "enganador", "enganadora", 
  "trapaceiro", "vigarista", "171", "mafioso", "máfia", "mafia", 
  "admin ladrão", "admin ladrao", "suporte lixo", "suporte inútil", "suporte inutil", 
  "admin inútil", "admin inutil", "adm corrupto", "admin corrupto", "moderador corrupto", 
  "staff lixo", "staff incompetente", "empresa corrupta", "empresa de ladrões", "empresa de ladroes", 
  "dono ladrão", "dono ladrao", "vocês roubam", "voces roubam", "estão roubando", "estao roubando", 
  "vocês são burlões", "voces sao burloes", 
  "não paga", "nao paga", "não pagam", "nao pagam", "perdi dinheiro", "perdi tudo", 
  "não recebi", "nao recebi", "sumiram com dinheiro", "bloquearam saque", "não consigo sacar", 
  "nao consigo sacar", "site caiu", "empresa faliu", "empresa vai fechar", "vai fechar", 
  "quebrou", "falida", "falido", "sistema roubando", "dinheiro preso", "não vale nada", "nao vale nada", 
  "ganha dinheiro rapido", "dinheiro facil", "hack", "hacker", "clonar", 
  "cartão roubado", "cartao roubado", "bitcoin gratis", "investimento falso", 
  "entra no meu link", "usa meu link", "me chama no privado", "grupo fake", "grupo falso", 
  "tenho hack", "hack saque", "hack sistema", "bug de saque", "método secreto", "metodo secreto", 
  "ganhar sem investir", "dinheiro fácil", "lucro garantido", "100% garantido", 
  "não confiem", "nao confiem", "não invistam", "nao invistam", "isso é golpe", "isso e golpe", 
  "empresa scam", "site scam", "app scam", "plataforma scam", "plataforma falsa", "empresa fake", 
  "saque falso", "pagamento falso"
]));

const ESCAPED_FORBIDDEN = FORBIDDEN_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const FORBIDDEN_REGEX = new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${ESCAPED_FORBIDDEN.join('|')})(?:[^\\p{L}\\p{N}]|$)`, 'iu');

const CONTEXT_GROUPS: Record<string, { path: string, keywords: string[] }> = {
  Home: { path: "/home", keywords: ["home", "início", "inicio", "pagina inicial", "painel", "dashboard"] },
  Withdraw: { path: "/retirada", keywords: ["saque", "sacar", "retirada", "retirar", "levantamento", "levantar dinheiro", "withdraw", "withdrawal", "retrait", "retirer"] },
  Recharge: { path: "/recarregar", keywords: ["recarga", "recarregar", "depósito", "depositar", "recharge"] },
  Invite: { path: "/convite", keywords: ["convite", "convidar", "amigo", "afiliado", "indicar"] },
  Support: { path: "/telegramBussiness", keywords: ["suporte", "ajuda", "atendimento", "help"] },
  Operations: { path: "/operacoes", keywords: ["operações", "operacoes", "trabalho", "tarefa", "tarefas"] },
  ProductDetails: { path: "/bot-pay", keywords: ["produto", "investimento", "plano", "lucro"] }
};

const KEYWORD_TO_PATH: Record<string, string> = {};
Object.values(CONTEXT_GROUPS).forEach(group => {
  group.keywords.forEach(kw => {
    KEYWORD_TO_PATH[kw.toLowerCase()] = group.path;
  });
});

const ALL_KEYWORDS_SORTED = Object.keys(KEYWORD_TO_PATH).sort((a, b) => b.length - a.length);
const SMART_CONTEXT_REGEX = new RegExp(`(${ALL_KEYWORDS_SORTED.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

const translationCache = new Map<string, string>();
const translationQueue: (() => Promise<void>)[] = [];
let isTranslating = false;

const processTranslationQueue = async () => {
  if (isTranslating) return;
  isTranslating = true;
  while (translationQueue.length > 0) {
    const task = translationQueue.shift();
    if (task) {
      await task();
      await new Promise(r => setTimeout(r, 100));
    }
  }
  isTranslating = false;
};

const translateTextAPI = (text: string, lang: string): Promise<string> => {
  return new Promise((resolve) => {
    if (!text || text.trim() === '') return resolve(text);
    const cacheKey = `${lang}:${text}`;
    if (translationCache.has(cacheKey)) return resolve(translationCache.get(cacheKey)!);
    
    translationQueue.push(async () => {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json && json[0]) {
          const result = json[0].map((item: any) => item[0]).join('');
          translationCache.set(cacheKey, result);
          resolve(result);
        } else resolve(text);
      } catch {
        resolve(text);
      }
    });
    processTranslationQueue();
  });
};

const TranslatedMessage = ({ text, language, renderFormatted }: { text: string, language: string, renderFormatted: (t: string) => React.ReactNode }) => {
  const [translated, setTranslated] = useState<string>(text);

  useEffect(() => {
    let isMounted = true;
    if (!text) return;
    if (language === 'pt') { setTranslated(text); return; }
    setTranslated(translationCache.get(`${language}:${text}`) || text);
    translateTextAPI(text, language).then(result => { if (isMounted) setTranslated(result); });
    return () => { isMounted = false; };
  }, [text, language]);

  return <>{renderFormatted(translated)}</>;
};

const USER_COLORS = [
  "#229ED9", "#E56555", "#8E44AD", "#27AE60", "#D35400", "#16A085", "#C0392B", "#2980B9"
];

function getUserColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// Cache de telefones em memória para ultra performance
const phoneCache: Record<string, string> = {};

export default function CommunityChat() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();
  const { language } = useLanguage();

  // Sempre inicia vazio para carregar apenas dados reais do banco de dados
  const [publicMessages, setPublicMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publicInput, setPublicInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const EMOJIS = [
    { char: "👍", label: "Gosto" },
    { char: "❤️", label: "Adoro" },
    { char: "🔥", label: "Fogo" },
    { char: "😂", label: "Riso" },
    { char: "😮", label: "Surpresa" },
    { char: "😢", label: "Tristeza" },
    { char: "🙏", label: "Grato" }
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
      setShowScrollDown(!isAtBottom);
    }
  };

  const renderFormattedMessage = (text: string) => {
    if (!text) return null;
    const parts = text.split(SMART_CONTEXT_REGEX);
    const usedGroups = new Set<string>();

    return parts.map((part, i) => {
      const lowerPart = part.toLowerCase();
      const path = KEYWORD_TO_PATH[lowerPart];
      if (path && !usedGroups.has(path)) {
        usedGroups.add(path);
        return (
          <span 
            key={i}
            onClick={(e) => { e.stopPropagation(); navigate(path); }}
            className="text-[#229ED9] font-medium underline cursor-pointer hover:opacity-80 transition-opacity"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const fetchMessages = async (isInitial = false) => {
    try {
      const { data, error } = await supabase
        .from('chat_gruop')
        .select('*')
        .order('data_registrada', { ascending: false })
        .limit(60);
      if (error) throw error;
      if (data) {
        // Busca apenas números de telefone dos perfis
        const uncachedIds = Array.from(new Set(data.map((m: any) => m.uid_emissor).filter((id: string) => id && !phoneCache[id])));
        if (uncachedIds.length > 0) {
          const { data: profiles } = await supabase
            .from('sys_t500')
            .select('id, telefone')
            .in('id', uncachedIds);
          if (profiles) {
            profiles.forEach((p: any) => {
              phoneCache[p.id] = p.telefone || "Telefone Desconhecido";
            });
          }
        }

        const dataWithPhones = data.map((m: any) => ({
          ...m,
          perfis_mcpn: { telefone: phoneCache[m.uid_emissor] || "Telefone Desconhecido" }
        }));

        const sorted = dataWithPhones.reverse();
        setPublicMessages(prev => {
          const msgMap = new Map();
          prev.forEach(m => msgMap.set(m.id, m));
          sorted.forEach((m: any) => msgMap.set(m.id, m));
          const result = Array.from(msgMap.values()).sort((a, b) =>
            new Date(a.data_registrada).getTime() - new Date(b.data_registrada).getTime()
          );

          if (prev.length === result.length) {
            let unchanged = true;
            for (let i = 0; i < result.length; i++) {
              if (
                prev[i]?.id !== result[i]?.id ||
                prev[i]?.mensagem !== result[i]?.mensagem ||
                JSON.stringify(prev[i]?.detalhes) !== JSON.stringify(result[i]?.detalhes) ||
                prev[i]?.perfis_mcpn?.telefone !== result[i]?.perfis_mcpn?.telefone
              ) {
                unchanged = false;
                break;
              }
            }
            if (unchanged) return prev;
          }

          return result;
        });
        if (isInitial) scrollToBottom("auto");
      }
    } catch (err) {
      console.error("Erro ao buscar mensagens da comunidade:", err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  useEffect(() => {
    try { localStorage.removeItem('community_chat_cache'); } catch {}
    fetchMessages(true);
    pollingRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchMessages(false);
      }
    }, 2500);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("addbank_telegram_chat_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_gruop" }, async (payload) => {
        if (payload.eventType === "DELETE") {
          setPublicMessages(prev => prev.filter(m => m.id !== payload.old.id));
          return;
        }
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const { data } = await supabase.from("chat_gruop").select('*').eq("id", payload.new.id).single();
          if (data) { 
            let tel = phoneCache[data.uid_emissor] || null;
            if (!tel && data.uid_emissor) {
              const { data: prof } = await supabase
                .from('sys_t500')
                .select('telefone')
                .eq('id', data.uid_emissor)
                .maybeSingle();
              if (prof?.telefone) {
                tel = prof.telefone;
                phoneCache[data.uid_emissor] = tel;
              }
            }
            const dataWithPhone = { ...data, perfis_mcpn: { telefone: tel || "Telefone Desconhecido" } };
            setPublicMessages((c) => {
              const msgMap = new Map(c.map(m => [m.id, m]));
              msgMap.set(data.id, dataWithPhone);
              return Array.from(msgMap.values()).sort((a, b) => 
                new Date(a.data_registrada).getTime() - new Date(b.data_registrada).getTime()
              );
            }); 
            if (payload.eventType === "INSERT" && scrollRef.current) scrollToBottom();
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const validateMessage = (text: string) => {
    if (text.length > 2000) return "A mensagem é muito longa.";
    if (FORBIDDEN_REGEX.test(text)) return "Por favor, evite termos ofensivos.";
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
    const matches = text.match(urlRegex);
    if (matches) {
      const allowed = ['azure', 'mcn', 'telegram business', 't.me'];
      if (matches.some(m => !allowed.some(d => m.toLowerCase().includes(d))))
        return "Não são permitidos links externos.";
    }
    return null;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Máximo 5MB.", "error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (!user || (!publicInput.trim() && !imagePreview)) return;
    if (publicInput.trim()) {
      const err = validateMessage(publicInput.trim());
      if (err) { showToast(err, "error"); return; }
    }
    const tempMsg = publicInput.trim();
    const tempImg = imagePreview;
    const tempReply = replyTo;
    const detalhes: Record<string, any> = {};
    if (tempImg) { detalhes.imagem_url = tempImg; detalhes.tipo_midia = 'imagem'; }
    if (tempReply) { detalhes.resposta_para_id = tempReply.id; detalhes.reply = { id: tempReply.id, text: tempReply.mensagem, sender: tempReply.perfis_mcpn?.telefone || '' }; }

    setPublicInput("");
    setImagePreview(null);
    setReplyTo(null);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "auto";
      inputRef.current.focus();
    }

    // Envio Otimista Imediato
    const tempId = Date.now();
    const optimisticMessage = {
      id: tempId,
      uid_emissor: user.id,
      mensagem: tempMsg || "",
      detalhes,
      data_registrada: new Date().toISOString(),
      perfis_mcpn: { telefone: "Eu" }
    };
    setPublicMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    setIsSending(true);
    try {
      const { data, error } = await supabase.from("chat_gruop").insert([{
        uid_emissor: user.id,
        mensagem: tempMsg || "",
        detalhes,
      }]).select().single();

      if (error) throw error;
      if (data) {
        setPublicMessages(prev => prev.map(m => m.id === tempId ? { ...data, perfis_mcpn: { telefone: "Eu" } } : m));
      }
      scrollToBottom();
    } catch (err: any) { 
      console.error("Erro ao enviar mensagem na comunidade:", err);
      showToast("Erro ao enviar mensagem.", "error"); 
    } finally { 
      setIsSending(false); 
    }
  };

  const handleToggleReaction = async (messageId: number, emoji: string) => {
    if (!user) return;
    setReactionMenuId(null);
    try {
      await supabase.rpc('toggle_reaction_mcpn', {
        p_message_id: messageId,
        p_emoji: emoji,
        p_user_id: user.id
      });
    } catch {}
  };

  const handleLongPressStart = (id: number) => {
    const timer = setTimeout(() => {
      setReactionMenuId(id);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => { if (longPressTimer) clearTimeout(longPressTimer); };

  const formatTime = (ts: string) => ts ? new Date(ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "";
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    return d.toLocaleDateString("pt-PT", { day: "numeric", month: "long" });
  };

  const formatSenderPhone = (p: string) => {
    if (!p || p === "Membro") return "Membro";
    const clean = p.replace(/^\+?244\s*/, '').trim();
    if (/^\d{9}$/.test(clean)) {
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
    }
    return clean;
  };

  const handleDownloadImage = async (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `imagem_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Download concluído!', 'success');
    } catch {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.download = `imagem_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full h-[100dvh] bg-[#9bb88a] font-sans antialiased text-[#202020] select-none flex flex-col items-center overflow-hidden relative">
      
      {/* Background Telegram Doodle Pattern Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `radial-gradient(#5a7a49 1px, transparent 1px), radial-gradient(#5a7a49 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }}
      />

      {/* FLOATING TELEGRAM CAPSULE HEADER */}
      <header className="w-full max-w-[480px] px-3 pt-3 pb-2 sticky top-0 z-30 flex items-center justify-between">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/telegramBussiness')} 
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#202020] active:scale-90 transition-transform cursor-pointer shrink-0"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
        </button>

        {/* Center Capsule Pill */}
        <div 
          onClick={() => setShowInfo(true)}
          className="rounded-full bg-white shadow-md py-1.5 px-3 flex items-center gap-2.5 flex-1 mx-2 cursor-pointer active:scale-[0.99] transition-transform min-w-0"
        >
          {/* Static Clean Telegram Avatar */}
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#37aee2] flex items-center justify-center shadow-xs overflow-hidden">
              <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px]">
                <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232"/>
                <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"/>
                <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
              </svg>
            </div>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="text-[14.5px] font-bold text-[#202020] tracking-tight truncate leading-tight">
              Telegram Business
            </h1>
            <span className="text-[11.5px] text-[#8e8e93] font-normal leading-tight">
              54 281 membros
            </span>
          </div>
        </div>

        {/* More Actions Button */}
        <button 
          onClick={() => setShowInfo(true)} 
          className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-[#202020] active:scale-90 transition-transform cursor-pointer shrink-0"
          aria-label="Mais informações"
        >
          <MoreVertical className="w-5 h-5 text-gray-700" />
        </button>
      </header>

      {/* CHAT MESSAGES AREA */}
      <main 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="w-full max-w-[480px] flex-1 overflow-y-auto no-scrollbar px-3 pt-2 pb-24 space-y-2 relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {publicMessages.map((m, i) => {
          const isMe = m.uid_emissor === user?.id;
          const phone = m.perfis_mcpn?.telefone || "Utilizador";
          const showDate = i === 0 || formatDateLabel(m.data_registrada) !== formatDateLabel(publicMessages[i-1].data_registrada);
          const authorColor = getUserColor(phone);

          const parsedData: any = (m.detalhes && typeof m.detalhes === 'object') ? m.detalhes : {};
          const reply = parsedData.reply;
          const reactions = parsedData.reacoes || {};

          return (
            <React.Fragment key={m.id}>
              {/* Date Badge */}
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="text-[12px] font-medium text-white bg-black/35 backdrop-blur-xs rounded-full px-3.5 py-0.5 shadow-2xs">
                    {formatDateLabel(m.data_registrada)}
                  </span>
                </div>
              )}
              
              <motion.div 
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-1.5 ${isMe ? "justify-end" : "justify-start"} relative group`}
              >
                {/* Incoming Message Avatar */}
                {!isMe && (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0 mb-0.5 shadow-xs overflow-hidden"
                    style={{ backgroundColor: authorColor }}
                  >
                    {phone.slice(-2)}
                  </div>
                )}

                {/* Reaction Quick Picker on Long Press */}
                <AnimatePresence>
                  {reactionMenuId === m.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: -42 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={`absolute z-[100] bg-white rounded-full px-2 py-1 flex gap-1 shadow-lg border border-gray-200 ${isMe ? 'right-0' : 'left-9'}`}
                    >
                      {EMOJIS.map(e => (
                        <button 
                          key={e.char} 
                          onClick={() => handleToggleReaction(m.id, e.char)} 
                          className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all active:scale-125 text-[16px] cursor-pointer"
                        >
                          {e.char}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bubble Container */}
                <div
                  onPointerDown={() => handleLongPressStart(m.id)}
                  onPointerUp={handleLongPressEnd}
                  onPointerLeave={handleLongPressEnd}
                  onDoubleClick={() => setReplyTo(m)}
                  className={cn(
                    "max-w-[82%] px-3.5 py-2 text-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.06)] relative select-text",
                    isMe 
                      ? "bg-[#dcf8c6] rounded-[18px] rounded-br-[4px]" 
                      : "bg-white rounded-[18px] rounded-bl-[4px]"
                  )}
                >
                  {/* Sender Name for Incoming */}
                  {!isMe && (
                    <p 
                      className="text-[13px] font-bold mb-0.5 cursor-pointer truncate"
                      style={{ color: authorColor }}
                    >
                      {phone}
                    </p>
                  )}

                  {/* Reply Quote Block */}
                  {reply && (
                    <div className={cn(
                      "rounded-[8px] px-2.5 py-1 mb-1.5 text-[11px] border-l-[3px] bg-black/5 overflow-hidden",
                      isMe ? "border-[#25D366] text-[#444444]" : "border-[#2b82c9] text-[#555555]"
                    )}>
                      <p className="font-bold text-[11px] text-[#2b82c9] truncate">{reply.sender}</p>
                      <p className="truncate italic text-[11px] text-[#666666]">{reply.text || "📷 Foto"}</p>
                    </div>
                  )}

                  {/* Attached Image */}
                  {parsedData.imagem_url && (
                    <div className="mb-1.5 -mx-1.5 -mt-0.5 overflow-hidden rounded-[14px]">
                      <img
                        src={parsedData.imagem_url}
                        alt="Anexo"
                        className="w-full h-auto max-h-[260px] object-cover cursor-pointer active:opacity-90 rounded-[14px]"
                        onClick={() => setZoomedImage(parsedData.imagem_url)}
                      />
                    </div>
                  )}

                  {/* Message Content & Timestamp */}
                  <div className="relative">
                    <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap pr-12 text-[#202020] font-normal">
                      <TranslatedMessage text={m.mensagem} language={language} renderFormatted={renderFormattedMessage} />
                    </p>
                    
                    <div className="absolute right-0 bottom-[-2px] flex items-center gap-0.5 select-none">
                      <span className={`text-[10.5px] font-normal ${isMe ? 'text-[#55864e]' : 'text-[#8e8e93]'}`}>
                        {formatTime(m.data_registrada)}
                      </span>
                      {isMe && (
                        <CheckCheck className="w-3.5 h-3.5 text-[#4fae4e] stroke-[2.4]" />
                      )}
                    </div>
                  </div>

                  {/* Emoji Reactions */}
                  {Object.keys(reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-black/5">
                      {Object.entries(reactions).map(([emoji, users]: [string, any]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(m.id, emoji)}
                          className="bg-white/80 border border-black/5 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-2xs hover:bg-white active:scale-95 transition-transform cursor-pointer"
                        >
                          <span className="text-[11px]">{emoji}</span>
                          <span className="text-[10px] font-bold text-[#555555]">{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
      </main>

      {/* FLOATING SCROLL DOWN BUTTON */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="fixed bottom-[74px] right-4 w-10 h-10 bg-white text-gray-700 rounded-full shadow-lg flex items-center justify-center z-40 active:scale-90 transition-transform cursor-pointer border border-gray-100"
            aria-label="Rolar para o fundo"
          >
            <ArrowDown className="w-5 h-5 stroke-[2.2]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* BOTTOM INPUT BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-2.5 z-40 flex justify-center">
        <div className="w-full max-w-[480px] flex flex-col gap-1.5">
          
          {/* Reply Banner */}
          <AnimatePresence>
            {replyTo && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="bg-white/95 backdrop-blur-md border-l-[3px] border-[#25D366] rounded-[14px] px-3 py-1.5 shadow-md flex justify-between items-center"
              >
                <div className="truncate flex-1">
                  <p className="text-[11px] font-bold text-[#25D366]">
                    A responder a {formatSenderPhone(replyTo.perfis_mcpn?.telefone || "Membro")}
                  </p>
                  <p className="text-[11px] text-[#777777] truncate italic">
                    <TranslatedMessage text={replyTo.mensagem} language={language} renderFormatted={(t: string) => t || 'Foto'} />
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setReplyTo(null)} 
                  className="text-gray-400 hover:text-black p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Controls */}
          <div className="flex items-end gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
            />

            {/* Pill Container for Emoji, Textarea, Attachment */}
            <div className="flex-1 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center px-3.5 py-1.5 min-h-[46px] border border-gray-100/80">
              {/* Emoji Icon */}
              <button 
                type="button" 
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0"
                title="Emojis"
              >
                <Smile className="w-6 h-6 stroke-[1.8]" />
              </button>

              {/* Image Preview Thumbnail if attached */}
              {imagePreview && (
                <div className="relative mr-2 shrink-0">
                  <img src={imagePreview} alt="preview" className="w-8 h-8 object-cover rounded-lg border border-gray-200" />
                  <button 
                    type="button" 
                    onClick={() => setImagePreview(null)} 
                    className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-black"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}

              {/* Text Input */}
              <textarea
                ref={inputRef}
                value={publicInput}
                onChange={(e) => {
                  setPublicInput(e.target.value);
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
                className="w-full px-2 py-1.5 text-[15px] bg-transparent resize-none outline-none max-h-[100px] text-black placeholder:text-gray-400 font-normal leading-snug"
                rows={1}
              />

              {/* Paperclip / Attach File Icon */}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0 rotate-[-45deg]"
                title="Anexar foto"
              >
                <Paperclip className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Separate Circle Send / Mic Button */}
            <button 
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="w-[46px] h-[46px] rounded-full bg-[#25D366] text-white flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_8px_rgba(37,211,102,0.4)] cursor-pointer"
              title="Enviar"
            >
              {(publicInput.trim() || imagePreview) ? (
                <Send className="w-5 h-5 text-white ml-0.5 stroke-[2]" />
              ) : (
                <Mic className="w-5 h-5 text-white stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* INFO MODAL */}
      <AnimatePresence>
        {showInfo && (
          <div 
            className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" 
            onClick={() => setShowInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[20px] w-full max-w-[380px] p-5 shadow-2xl relative border border-gray-100" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h2 className="text-[15px] font-bold text-[#202020]">Detalhes do Canal</h2>
                <button 
                  type="button"
                  onClick={() => setShowInfo(false)} 
                  className="text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="pt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-linear-to-tr from-[#1e96c8] to-[#37aee2] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                      <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232"/>
                      <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"/>
                      <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[14.5px] font-bold text-[#202020]">Telegram Business</h3>
                    <p className="text-[12px] text-[#25D366] font-medium">Canal Oficial Verificado</p>
                  </div>
                </div>

                <div className="bg-[#f1f1f2] rounded-[14px] p-3 space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#666666]">Tipo:</span>
                    <span className="font-semibold text-[#202020]">Canal Oficial</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#666666]">Moderação:</span>
                    <span className="font-semibold text-emerald-600">Ativa 24/7</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#666666]">Membros:</span>
                    <span className="font-semibold text-[#25D366]">3 membros</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="w-full h-[42px] rounded-[14px] bg-[#25D366] text-white font-semibold text-[14px] active:scale-[0.99] transition-all cursor-pointer shadow-xs"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ZOOM IMAGE MODAL */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-2" 
            onClick={() => setZoomedImage(null)}
          >
            <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-[12px]" alt="Zoom" />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button 
                type="button"
                className="text-white p-2 hover:bg-white/10 rounded-full cursor-pointer flex items-center justify-center transition-colors"
                onClick={(e) => handleDownloadImage(zoomedImage, e)}
                title="Baixar imagem"
              >
                <Download className="w-6 h-6 stroke-[2]" />
              </button>
              <button 
                type="button"
                className="text-white hover:text-[#FE384F] p-2 hover:bg-white/10 rounded-full cursor-pointer flex items-center justify-center transition-colors"
                onClick={() => setZoomedImage(null)}
                title="Fechar"
              >
                <X className="w-6 h-6 stroke-[2]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
