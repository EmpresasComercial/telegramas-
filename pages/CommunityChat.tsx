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
  Download,
  Smile,
  Mic,
  ArrowLeft,
  Pencil,
  MessageCircle,
  Bell,
  LogOut,
  QrCode,
  UserPlus,
  Check,
  Reply,
  Copy,
  Trash2,
  ChevronRight
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

const phoneCache: Record<string, string> = {};

const GROUP_MEMBERS = [
  {
    id: 'm1',
    name: 'Thomas Hall',
    badge: 'Admin',
    badgeType: 'admin',
    status: 'online',
    isOnline: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
  },
  {
    id: 'm2',
    name: 'Lauren Gabriella 🥰',
    status: 'visto às 20:31',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop'
  },
  {
    id: 'm3',
    name: 'Brilson Edlézio',
    status: 'visto às 20:13',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
  },
  {
    id: 'm4',
    name: 'ID 4700',
    badge: 'Dono',
    badgeType: 'owner',
    status: 'visto às 20:13',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop'
  },
  {
    id: 'm5',
    name: 'Chrina Manual',
    status: 'visto às 19:57',
    avatar: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=100&h=100&fit=crop'
  },
  {
    id: 'm6',
    name: 'PATRICIA',
    status: 'visto às 19:42',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    id: 'm7',
    name: 'Carlos Manuel',
    status: 'visto às 19:15',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop'
  },
  {
    id: 'm8',
    name: 'Mariana Santos',
    status: 'visto às 18:50',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop'
  },
  {
    id: 'm9',
    name: 'João Pedro',
    status: 'visto às 18:22',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop'
  },
  {
    id: 'm10',
    name: 'Nelson Mandela Neto',
    status: 'visto às 17:40',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop'
  }
];

const COMMUNITY_QUICK_REACTIONS = ['❤️', '🫡', '🤷‍♂️', '👍', '👎', '🔥', '🥰', '🎉', '👏', '😂', '😮', '😢'];

export default function CommunityChat() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();
  const { language } = useLanguage();

  const [publicMessages, setPublicMessages] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);
  const [publicInput, setPublicInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [activeGroupTab, setActiveGroupTab] = useState<'members' | 'media'>('members');
  const [isGroupMuted, setIsGroupMuted] = useState(false);
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [reactionMenuId, setReactionMenuId] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // ── Context Menu Telegram ──
  const [contextMenu, setContextMenu] = useState<{ message: any; isMe: boolean } | null>(null);
  const [showAllReactions, setShowAllReactions] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent, m: any, isMe: boolean) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = Math.abs(touch.clientX - touchStartRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartRef.current.y);
    const duration = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    if (diffX < 12 && diffY < 12 && duration < 600) {
      e.preventDefault();
      setContextMenu({ message: m, isMe });
      setShowAllReactions(false);
    }
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setShowAllReactions(false);
  };

  const handleDeleteMessage = async (msgId: number) => {
    try {
      await supabase.from('chat_gruop').delete().eq('id', msgId);
    } catch {}
    setPublicMessages(prev => prev.filter(m => m.id !== msgId));
    showToast('Mensagem apagada', 'info');
    closeContextMenu();
  };

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

  const isFetchingRef = useRef(false);

  const fetchMessages = async (isInitial = false) => {
    if (isFetchingRef.current && !isInitial) return;
    isFetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('chat_gruop')
        .select('*')
        .order('data_registrada', { ascending: false })
        .limit(60);
      if (error) throw error;
      if (data) {
        const uncachedIds = Array.from(new Set(data.map((m: any) => m.uid_emissor).filter((id: string) => id && !phoneCache[id])));
        if (uncachedIds.length > 0) {
          const { data: profiles } = await supabase
            .from('sys_t500')
            .select('id, telefone, nome_exibicao')
            .in('id', uncachedIds);
          if (profiles) {
            profiles.forEach((p: any) => {
              phoneCache[p.id] = p.nome_exibicao || p.telefone || "Membro";
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
      isFetchingRef.current = false;
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
    }, 3500);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("tg_community_chat_realtime")
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
                .select('telefone, nome_exibicao')
                .eq('id', data.uid_emissor)
                .maybeSingle();
              if (prof) {
                tel = prof.nome_exibicao || prof.telefone || "Membro";
                phoneCache[data.uid_emissor] = tel;
              }
            }
            const dataWithPhone = { ...data, perfis_mcpn: { telefone: tel || "Membro" } };
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
      const payload = {
        uid_emissor: user.id,
        mensagem: tempMsg || " ",
        detalhes,
      };
      console.log('[CommunityChat] Enviando para chat_gruop:', payload);
      const { error } = await supabase.from("chat_gruop").insert([payload]);

      if (error) {
        console.error('[CommunityChat] Erro insert:', error.code, error.message, error.details, error.hint);
        throw error;
      }
      console.log('[CommunityChat] Mensagem inserida com sucesso');
      scrollToBottom();
    } catch (err: any) { 
      console.error("Erro ao enviar mensagem na comunidade:", err);
      setPublicMessages(prev => prev.filter(m => m.id !== tempId));
      const errorMsg = err?.message || err?.error_description || "Erro ao enviar mensagem.";
      showToast(`Erro ao enviar: ${errorMsg}`, "error"); 
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

  // ── Ações do Menu de Contexto Telegram ──
  const menuActions = contextMenu ? [
    { 
      icon: Reply, 
      label: 'Responder', 
      onClick: () => { 
        setReplyTo(contextMenu.message); 
        closeContextMenu(); 
        setTimeout(() => inputRef.current?.focus(), 100); 
      }, 
      color: '#2481cc' 
    },
    { 
      icon: Copy, 
      label: 'Copiar', 
      onClick: () => { 
        navigator.clipboard.writeText(contextMenu.message.mensagem || '').catch(() => {}); 
        showToast('Mensagem copiada!', 'success'); 
        closeContextMenu(); 
      }, 
      color: '#555' 
    },
    ...(contextMenu.isMe ? [{ 
      icon: Pencil, 
      label: 'Editar', 
      onClick: () => { 
        setPublicInput(contextMenu.message.mensagem || ''); 
        closeContextMenu(); 
        setTimeout(() => inputRef.current?.focus(), 100); 
      }, 
      color: '#555' 
    }] : []),
    ...(contextMenu.isMe ? [{ 
      icon: Trash2, 
      label: 'Apagar', 
      onClick: () => handleDeleteMessage(contextMenu.message.id), 
      color: '#e53e3e',
      subLabel: 'Autoexcluirá em 31 dias'
    }] : [])
  ] : [];

  return (
    <div className="w-full h-[100dvh] font-sans antialiased text-[#202020] select-none flex flex-col items-stretch overflow-hidden relative tg-wallpaper transition-colors">
      <header className="w-full bg-[#517da2] dark:bg-[#242f3d] text-white px-3 sm:px-6 py-2 sticky top-0 z-40 flex items-center justify-between shadow-xs select-none">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button 
            onClick={() => navigate('/telegramBussiness')} 
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer shrink-0"
            aria-label="Voltar aos chats"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
          </button>

          <div 
            onClick={() => setShowInfo(true)} 
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#37aee2] flex items-center justify-center shadow-xs overflow-hidden shrink-0 border border-white/30">
              <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[20px] h-[20px]">
                <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232"/>
                <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"/>
                <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
              </svg>
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h1 className="text-[15.5px] font-semibold text-white tracking-tight truncate leading-tight">
                  Telegram Business Oficial
                </h1>
                <span className="w-4 h-4 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                </span>
              </div>
              <span className="text-[12px] text-white/80 font-normal leading-tight">
                54 281 membros, 1 420 online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowInfo(true)} 
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
            aria-label="Mais informações"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="w-full flex-1 overflow-y-auto no-scrollbar px-3 sm:px-6 md:px-10 lg:px-16 pt-2 pb-24 space-y-2.5 relative scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
                {!isMe && (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0 mb-0.5 shadow-xs overflow-hidden"
                    style={{ backgroundColor: authorColor }}
                  >
                    {phone.slice(-2)}
                  </div>
                )}

                <div
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setContextMenu({ message: m, isMe }); 
                    setShowAllReactions(false); 
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, m, isMe)}
                  className={cn(
                    "tg-bubble max-w-[82%] px-3.5 py-2 text-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.06)] relative cursor-pointer active:brightness-95 active:scale-[0.985] transition-all select-none rounded-[18px]",
                    isMe 
                      ? "bg-[#dcf8c6]" 
                      : "bg-white",
                    contextMenu?.message.id === m.id && "brightness-90 scale-[0.985]"
                  )}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  {!isMe && (
                    <p 
                      className="text-[13px] font-bold mb-0.5 cursor-pointer truncate"
                      style={{ color: authorColor }}
                    >
                      {phone}
                    </p>
                  )}

                  {reply && (
                    <div className={cn(
                      "rounded-[8px] px-2.5 py-1 mb-1.5 text-[11px] border-l-[3px] bg-black/5 overflow-hidden",
                      isMe ? "border-[#25D366] text-[#444444]" : "border-[#2b82c9] text-[#555555]"
                    )}>
                      <p className="font-bold text-[11px] text-[#2b82c9] truncate">{reply.sender}</p>
                      <p className="truncate italic text-[11px] text-[#666666]">{reply.text || "📷 Foto"}</p>
                    </div>
                  )}

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

      <div className="fixed bottom-0 left-0 right-0 p-2.5 z-40 flex justify-center">
        <div className="w-full max-w-[480px] flex flex-col gap-1.5">
          <AnimatePresence>
            {replyTo && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="bg-white/95 backdrop-blur-md border-l-[3px] border-[#2481cc] rounded-[14px] px-3 py-1.5 shadow-md flex justify-between items-center"
              >
                <div className="truncate flex-1">
                  <p className="text-[11px] font-bold text-[#2481cc]">
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

          <div className="flex items-end gap-2">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
            />

            <div className="flex-1 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center px-3.5 py-1.5 min-h-[46px] border border-gray-100/80">
              <button 
                type="button" 
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0"
                title="Emojis"
              >
                <Smile className="w-6 h-6 stroke-[1.8]" />
              </button>

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

              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="text-gray-400 hover:text-gray-600 p-1 active:scale-90 transition-transform shrink-0 rotate-[-45deg]"
                title="Anexar foto"
              >
                <Paperclip className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            <button 
              type="button"
              onClick={handleSend}
              disabled={isSending}
              style={{ borderRadius: '9999px' }}
              className="w-[46px] h-[46px] !rounded-full rounded-full bg-[#2481cc] hover:bg-[#1f72b5] text-white flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-[0_2px_10px_rgba(36,129,204,0.4)] cursor-pointer"
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

      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-[250] bg-[#f2f3f5] dark:bg-[#17212b] overflow-y-auto flex flex-col items-center select-none"
          >
            <div className="w-full max-w-[480px] min-h-screen flex flex-col bg-[#f2f3f5] dark:bg-[#17212b] text-[#111] dark:text-white pb-10">
              <div className="w-full flex items-center justify-between px-3 py-3 sticky top-0 bg-[#f2f3f5]/90 dark:bg-[#17212b]/90 backdrop-blur-md z-10">
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 dark:text-white hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                  aria-label="Voltar ao chat"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => showToast("Apenas administradores podem editar o grupo", "info")}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 dark:text-white hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
                    aria-label="Editar"
                  >
                    <Pencil className="w-5 h-5 stroke-[2]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast("Opções do grupo", "info")}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-gray-800 dark:text-white hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer relative"
                    aria-label="Mais opções"
                  >
                    <MoreVertical className="w-5 h-5 stroke-[2]" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center px-4 pt-1 pb-2">
                <div className="relative">
                  <div className="w-[105px] h-[105px] rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#37aee2] flex items-center justify-center shadow-md border-3 border-white dark:border-[#242f3d]">
                    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[56px] h-[56px]">
                      <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232"/>
                      <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"/>
                      <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
                    </svg>
                  </div>
                </div>

                <h1 className="text-[20px] font-bold text-[#111] dark:text-white text-center mt-3 leading-snug flex items-center justify-center gap-1.5 px-2">
                  <span>Telegram Business Oficial</span>
                  <span className="w-4 h-4 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                  </span>
                </h1>
                
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                  54 281 membros
                </p>
              </div>

              <div className="flex items-center justify-between px-4 mt-3 gap-2">
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="flex-1 min-w-0 h-[72px] bg-white dark:bg-[#242f3d] rounded-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/50 dark:border-transparent flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-[22px] h-[22px] text-[#222] dark:text-white stroke-[1.8]" />
                  <span className="text-[10.5px] font-medium text-gray-700 dark:text-gray-200 truncate px-0.5">
                    Mensagem
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsGroupMuted(!isGroupMuted);
                    showToast(isGroupMuted ? "Notificações ativadas" : "Notificações silenciadas", "info");
                  }}
                  className="flex-1 min-w-0 h-[72px] bg-white dark:bg-[#242f3d] rounded-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/50 dark:border-transparent flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Bell className={`w-[22px] h-[22px] ${isGroupMuted ? 'text-[#ff595a]' : 'text-[#222] dark:text-white'} stroke-[1.8]`} />
                  <span className="text-[10.5px] font-medium text-gray-700 dark:text-gray-200 truncate px-0.5">
                    {isGroupMuted ? "Silenciado" : "Silenciar"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast("Não é permitido sair do canal oficial", "error")}
                  className="flex-1 min-w-0 h-[72px] bg-white dark:bg-[#242f3d] rounded-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/50 dark:border-transparent flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <LogOut className="w-[22px] h-[22px] text-[#222] dark:text-white stroke-[1.8]" />
                  <span className="text-[10.5px] font-medium text-gray-700 dark:text-gray-200 truncate px-0.5">
                    Sair
                  </span>
                </button>
              </div>

              <div className="px-4 mt-3 space-y-2.5">
                <div 
                  onClick={() => {
                    navigator.clipboard.writeText("t.me/TelegramBusinessOficial");
                    setIsCopiedLink(true);
                    showToast("Link copiado para a área de transferência!", "success");
                    setTimeout(() => setIsCopiedLink(false), 2000);
                  }}
                  className="bg-white dark:bg-[#242f3d] rounded-[20px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/50 dark:border-transparent flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-[#2c3848] transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-[15px] font-semibold text-[#111] dark:text-white tracking-tight">
                      t.me/TelegramBusinessOficial
                    </span>
                    <span className="text-[12px] text-gray-400 dark:text-gray-400 mt-0.5">
                      {isCopiedLink ? "Copiado!" : "Link de Convite"}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <QrCode className="w-6 h-6 stroke-[1.8]" />
                  </div>
                </div>

                <div 
                  onClick={() => showToast("Apenas administradores podem adicionar membros", "info")}
                  className="bg-white dark:bg-[#242f3d] rounded-[20px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/50 dark:border-transparent flex items-center gap-3.5 cursor-pointer active:bg-gray-50 dark:active:bg-[#2c3848] transition-colors"
                >
                  <UserPlus className="w-5 h-5 text-gray-800 dark:text-white stroke-[2]" />
                  <span className="text-[15px] font-semibold text-[#111] dark:text-white">
                    Adicionar Membros
                  </span>
                </div>
              </div>

              <div className="flex justify-center mt-4 px-4">
                <div className="bg-[#e4e7eb] dark:bg-[#202b36] p-1 rounded-full flex items-center gap-1 w-full max-w-[240px]">
                  <button
                    type="button"
                    onClick={() => setActiveGroupTab('members')}
                    className={`flex-1 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer text-center ${
                      activeGroupTab === 'members'
                        ? 'bg-white dark:bg-[#2b5278] text-[#1da664] dark:text-[#4fae78] shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    Membros
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGroupTab('media')}
                    className={`flex-1 py-1.5 rounded-full text-[13px] font-semibold transition-all cursor-pointer text-center ${
                      activeGroupTab === 'media'
                        ? 'bg-white dark:bg-[#2b5278] text-[#1da664] dark:text-[#4fae78] shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    Mídias
                  </button>
                </div>
              </div>

              {activeGroupTab === 'members' && (
                <div className="px-4 mt-3">
                  <div className="bg-white dark:bg-[#242f3d] rounded-[22px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/50 dark:border-transparent overflow-hidden divide-y divide-gray-100/80 dark:divide-gray-700/50">
                    {GROUP_MEMBERS.map((member) => (
                      <div 
                        key={member.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/70 dark:hover:bg-[#202b36] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={member.avatar} 
                            alt={member.name}
                            className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-100"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[14.5px] font-semibold text-[#111] dark:text-white truncate">
                              {member.name}
                            </span>
                            <span className={`text-[12px] leading-tight ${member.isOnline ? 'text-[#25D366] font-medium' : 'text-gray-400 dark:text-gray-400'}`}>
                              {member.status}
                            </span>
                          </div>
                        </div>

                        {member.badge && (
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ml-2 ${
                            member.badgeType === 'admin'
                              ? 'bg-[#e8f8ef] text-[#22a05d] dark:bg-[#1a382b] dark:text-[#4ade80]'
                              : 'bg-[#f3e8ff] text-[#9333ea] dark:bg-[#341d4c] dark:text-[#c084fc]'
                          }`}>
                            {member.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeGroupTab === 'media' && (
                <div className="px-4 mt-3">
                  <div className="bg-white dark:bg-[#242f3d] rounded-[22px] p-6 text-center text-gray-400 dark:text-gray-400 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-200/50 dark:border-transparent">
                    <p className="text-[13.5px]">Nenhuma mídia compartilhada recentemente.</p>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ── CONTEXT MENU OVERLAY TELEGRAM NATIVO ── */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-[200] flex flex-col justify-end items-center px-4 pb-6 bg-black/50 backdrop-blur-xs transition-opacity"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          onClick={closeContextMenu}
        >
          <div
            className="w-full max-w-[325px] flex flex-col gap-2 select-none"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              animation: 'slideUpMenu 0.18s cubic-bezier(0.16, 1, 0.3, 1) both',
              touchAction: 'manipulation'
            }}
          >
            {/* ── Barra Flutuante de Reações Telegram ── */}
            <div className="bg-white dark:bg-[#2b2b2b] rounded-2xl shadow-xl px-2.5 py-2 flex items-center justify-between border border-gray-100 dark:border-white/10">
              {(showAllReactions ? COMMUNITY_QUICK_REACTIONS : COMMUNITY_QUICK_REACTIONS.slice(0, 7)).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleToggleReaction(contextMenu.message.id, emoji);
                    showToast(`Reação ${emoji} adicionada!`, 'success');
                    closeContextMenu();
                  }}
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

      {/* ── Animações CSS injetadas ── */}
      <style>{`
        @keyframes slideUpMenu {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  );
}
