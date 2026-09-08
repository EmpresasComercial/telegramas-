import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { formatCurrency } from "../lib/currency";
import { MoreVertical, Send, Clock, ChevronDown, X } from "lucide-react";
import { useToast } from "../components/Toast";

/* ─── SVG Doodle Background (Telegram BotFather style) ─────────── */
const DOODLE_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cg fill='none' stroke='%2372a072' stroke-width='1.2' opacity='0.45'%3E%3Ccircle cx='30' cy='28' r='10'/%3E%3Cpath d='M22 20L19 13L25 19'/%3E%3Cpath d='M38 20L41 13L35 19'/%3E%3Ccircle cx='26' cy='25' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='34' cy='25' r='1.5' fill='%2372a072'/%3E%3Cpath d='M30 31L28 33L30 32L32 33Z'/%3E%3Cpath d='M19 27L24 28'/%3E%3Cpath d='M41 27L36 28'/%3E%3Cpath d='M164 15L167 7L170 15L178 15L172 20L174 28L167 23L160 28L162 20L156 15Z'/%3E%3Cpath d='M95 52C95 44 84 38 84 49C84 58 95 67 95 67C95 67 106 58 106 49C106 38 95 44 95 52Z'/%3E%3Ccircle cx='20' cy='112' r='7'/%3E%3Ccircle cx='10' cy='103' r='3.5'/%3E%3Ccircle cx='30' cy='103' r='3.5'/%3E%3Ccircle cx='14' cy='97' r='3'/%3E%3Ccircle cx='26' cy='97' r='3'/%3E%3Crect x='150' cy='100' width='26' height='19' rx='2'/%3E%3Crect x='148' y='93' width='30' height='9' rx='2'/%3E%3Cline x1='163' y1='93' x2='163' y2='119'/%3E%3Cpath d='M159 93C156 87 163 84 163 93'/%3E%3Cpath d='M167 93C170 87 163 84 163 93'/%3E%3Ccircle cx='163' cy='162' r='10'/%3E%3Cpath d='M155 154L152 146L158 153'/%3E%3Cpath d='M171 154L174 146L168 153'/%3E%3Ccircle cx='159' cy='160' r='1.5' fill='%2372a072'/%3E%3Ccircle cx='167' cy='160' r='1.5' fill='%2372a072'/%3E%3Cpath d='M163 164L161 166L163 165L165 166Z'/%3E%3Cpath d='M152 162L158 163'/%3E%3Cpath d='M174 162L168 163'/%3E%3Cpath d='M57 143C57 138 51 135 51 140C51 145 57 150 57 150C57 150 63 145 63 140C63 135 57 138 57 143Z'/%3E%3Cpath d='M140 44C140 39 134 36 134 41C134 46 140 51 140 51C140 51 146 46 146 41C146 36 140 39 140 44Z'/%3E%3Cpath d='M64 72L66 64L68 72L76 72L70 77L72 85L66 81L60 85L62 77L56 72Z'/%3E%3Cpath d='M127 134L129 126L131 134L139 134L133 139L135 147L129 143L123 147L125 139L119 134Z'/%3E%3Cpath d='M95 110L95 128'/%3E%3Ccircle cx='92' cy='129' r='4'/%3E%3Cpath d='M95 110L106 106L106 120'/%3E%3Ccircle cx='103' cy='121' r='4'/%3E%3C/g%3E%3C/svg%3E")`;

/* ─── Interfaces ─────────────────────────────────────────────────── */
interface PurchasedBot {
  id: string;
  preco_pago: number;
  renda_diaria: number;
  data_inicio: string;
  data_fim: string;
  dias_restantes: number;
  ativo: boolean;
  produto_nome: string;
  produto_imagem?: string;
  storage_size?: string;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  time: string;
  text?: string;
  type: "welcome" | "status_report" | "text" | "cycle_countdown";
  payload?: any;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function nowTime() {
  return new Date().toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
}

function getSecondsUntilNextCredit(dataInicio: string): number {
  try {
    const start = new Date(dataInicio);
    const now = new Date();
    const next = new Date();
    next.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  } catch { return 86400; }
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

function PurchasedBotCountdown({ dataInicio }: { dataInicio: string }) {
  const [sec, setSec] = useState(() => getSecondsUntilNextCredit(dataInicio));
  useEffect(() => {
    const timer = setInterval(() => {
      setSec((prev) => (prev <= 1 ? getSecondsUntilNextCredit(dataInicio) : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [dataInicio]);
  return (
    <span className="font-mono text-[12px] font-bold text-[#2481cc] tabular-nums bg-[#e8f4fd] px-1.5 py-0.5 rounded">
      {formatCountdown(sec)}
    </span>
  );
}

/* ─── Bot Bubble with tail ────────────────────────────────────────── */
function BotBubble({ children, time }: { children: React.ReactNode; time: string }) {
  return (
    <div className="flex flex-col items-start mb-2 max-w-[88%] sm:max-w-[80%] pl-2">
      <div className="relative w-full">
        {/* Telegram Top-Left Tail (SVG) */}
        <svg
          width="9"
          height="20"
          viewBox="0 0 9 20"
          className="absolute"
          style={{ top: 0, left: -8, fill: "white" }}
        >
          <path d="M9 0H0C4.5 0 8 4 9 12V0Z" />
        </svg>
        <div
          className="bg-white rounded-[16px] rounded-tl-none px-3.5 py-2.5 select-text w-full"
          style={{ boxShadow: "0 1px 2px rgba(16,35,47,0.15)" }}
        >
          {children}
          <div className="flex justify-end mt-1">
            <span className="text-[11px] text-[#8a8a8a] select-none">{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── User Bubble with tail ───────────────────────────────────────── */
function UserBubble({ text, time }: { text: string; time: string }) {
  const isCmd = text?.trim().startsWith("/");
  return (
    <div className="flex justify-end mb-1.5 pr-2">
      <div className="relative max-w-[80%]">
        <div
          className="bg-[#eeffde] rounded-[16px] rounded-br-none px-3.5 py-2 select-text"
          style={{ boxShadow: "0 1px 2px rgba(16,35,47,0.15)" }}
        >
          <p className={`text-[15px] leading-snug ${isCmd ? "text-[#1a7ac7] font-medium" : "text-black font-normal"}`}>
            {text}
          </p>
          <div className="flex justify-end items-center gap-1 mt-0.5 select-none">
            <span className="text-[11px] text-[#6a9a6a]">{time}</span>
            <span className="text-[11px] text-[#4fae4e] font-bold leading-none">✓✓</span>
          </div>
        </div>
        {/* Telegram Bottom-Right Tail (SVG) */}
        <svg
          width="9"
          height="20"
          viewBox="0 0 9 20"
          className="absolute"
          style={{ bottom: 0, right: -8, fill: "#eeffde" }}
        >
          <path d="M0 20H9C4.5 20 1 16 0 8V20Z" />
        </svg>
      </div>
    </div>
  );
}

/* ─── Componente Principal ───────────────────────────────────────── */
export default function PurchaseHistory() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [purchasedBots, setPurchasedBots] = useState<PurchasedBot[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showCommandsModal, setShowCommandsModal] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  /* ── Buscar Bots Comprados ── */
  const fetchPurchasedBots = useCallback(async () => {
    try {
      setLoading(true);
      let clean: PurchasedBot[] = [];

      try {
        const { data, error } = await supabase.rpc("get_my_purchased_products_mcpn");
        if (!error && data && Array.isArray(data) && data.length > 0) {
          clean = data.map((b: any) => ({
            id: b.id,
            preco_pago: Number(b.preco_pago) || 0,
            renda_diaria: Number(b.renda_diaria) || 0,
            data_inicio: b.data_inicio,
            data_fim: b.data_fim,
            dias_restantes: b.dias_restantes !== undefined ? Number(b.dias_restantes) : 0,
            ativo: Boolean(b.ativo),
            produto_nome: b.produto_nome || "Robô de Renda",
            produto_imagem: b.produto_imagem || "",
            storage_size: b.storage_size || "Cloud"
          }));
        }
      } catch (rpcErr) {
        console.warn("RPC falhou, tentando fallback:", rpcErr);
      }

      if (clean.length === 0) {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData?.session?.user?.id;
        if (uid) {
          const { data: sysData, error: sysError } = await (supabase as any)
            .from("sys_600")
            .select("*, produtos(nome, preco, renda_diaria, duracao_dias)")
            .eq("user_id", uid)
            .order("data_inicio", { ascending: false });

          if (!sysError && sysData && Array.isArray(sysData) && sysData.length > 0) {
            clean = sysData.map((b: any) => {
              const diffDays = b.data_fim
                ? Math.max(0, Math.ceil((new Date(b.data_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 90;
              const isStillActive = Boolean(b.ativo) && (!b.data_fim || new Date(b.data_fim) > new Date());
              return {
                id: b.id,
                preco_pago: Number(b.preco_pago) || Number(b.produtos?.preco) || 0,
                renda_diaria: Number(b.renda_diaria) || Number(b.produtos?.renda_diaria) || 0,
                data_inicio: b.data_inicio || b.created_at || new Date().toISOString(),
                data_fim: b.data_fim,
                dias_restantes: b.dias_restantes !== undefined ? Number(b.dias_restantes) : diffDays,
                ativo: isStillActive,
                produto_nome: b.produtos?.nome || b.produto_nome || "Robô de Renda",
                produto_imagem: "",
                storage_size: "Cloud"
              };
            });
          }
        }
      }

      setPurchasedBots(clean);

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const { data: userData } = await supabase
          .from("sys_t500")
          .select("saldo_disponivel")
          .eq("id", sessionData.session.user.id)
          .single();
        if (userData) setUserBalance(Number(userData.saldo_disponivel) || 0);
      }

      return clean;
    } catch (err) {
      console.error("Erro ao carregar bots:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initChat() {
      const bots = await fetchPurchasedBots();
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([{
          id: "welcome-init",
          sender: "bot",
          time: nowTime(),
          type: "welcome",
          payload: { activeCount: bots.filter((b) => b.ativo).length }
        }]);
      }, 500);
    }

    initChat();
  }, [fetchPurchasedBots]);

  const botReply = useCallback((builder: () => ChatMessage, delay = 650) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, builder()]);
    }, delay);
  }, []);

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const content = (textToSend || inputText).trim();
      if (!content) return;

      setMessages((prev) => [...prev, {
        id: "usr-" + Date.now(),
        sender: "user",
        time: nowTime(),
        text: content,
        type: "text"
      }]);
      if (!textToSend) setInputText("");

      const normalized = content.toLowerCase().replace(/^\//, "").trim();

      if (["start","inicio","início","help","ajuda","menu","comandos"].includes(normalized)) {
        botReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: nowTime(), type: "welcome",
          payload: { activeCount: purchasedBots.filter((b) => b.ativo).length }
        }));
        return;
      }

      if (["status","meusbots","mybots","ativos"].includes(normalized)) {
        let currentBots = purchasedBots;
        if (!currentBots || currentBots.length === 0) currentBots = await fetchPurchasedBots();
        if (!currentBots || currentBots.length === 0) {
          botReply(() => ({
            id: "bot-" + Date.now(), sender: "bot", time: nowTime(), type: "text",
            text: `Você não possui robôs comprados. Envie /comprar para abrir o catálogo.`
          }));
          return;
        }
        botReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: nowTime(),
          type: "status_report", payload: { bots: currentBots }
        }));
        return;
      }

      if (["rendimento","proximo","ciclo"].includes(normalized)) {
        let currentBots = purchasedBots;
        if (!currentBots || currentBots.length === 0) currentBots = await fetchPurchasedBots();
        if (!currentBots || currentBots.length === 0) {
          botReply(() => ({
            id: "bot-" + Date.now(), sender: "bot", time: nowTime(), type: "text",
            text: `Você não possui rendimentos ativos. Envie /comprar para adquirir um robô.`
          }));
          return;
        }
        botReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: nowTime(),
          type: "cycle_countdown", payload: { bots: currentBots }
        }));
        return;
      }

      if (["saldo","carteira"].includes(normalized)) {
        botReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: nowTime(), type: "text",
          text: `Saldo disponível na carteira: ${formatCurrency(userBalance, "KZ")}. Envie /comprar para ver os robôs.`
        }));
        return;
      }

      if (["comprar","bots","catalogo"].includes(normalized)) {
        botReply(() => ({
          id: "bot-" + Date.now(), sender: "bot", time: nowTime(), type: "text",
          text: "Abrindo o catálogo de robôs disponíveis para compra..."
        }));
        setTimeout(() => navigate("/bot-pay"), 900);
        return;
      }

      botReply(() => ({
        id: "bot-" + Date.now(), sender: "bot", time: nowTime(), type: "text",
        text: `Comando não reconhecido. Envie /ajuda para ver a lista de comandos disponíveis.`
      }));
    },
    [botReply, inputText, navigate, purchasedBots, userBalance, fetchPurchasedBots]
  );

  /* ── Renderizar conteúdo de texto com links clicáveis ── */
  function renderTextWithLinks(text: string) {
    return text.replace(/[*#]/g, "").split("\n").map((line, lIdx, arr) => {
      const parts = line.split(/(\/[-_a-zA-Z0-9]+)/g);
      return (
        <span key={lIdx}>
          {parts.map((part, pIdx) =>
            part.startsWith("/") ? (
              <span
                key={pIdx}
                onClick={() => handleSendMessage(part)}
                className="text-[#1a7ac7] underline cursor-pointer"
              >{part}</span>
            ) : part
          )}
          {lIdx < arr.length - 1 && <br />}
        </span>
      );
    });
  }

  return (
    <div
      className="w-full h-[100dvh] flex flex-col overflow-hidden select-none"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif" }}
    >
      {/* ── MODAL DE COMANDOS ── */}
      {showCommandsModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowCommandsModal(false)}
        >
          <div className="absolute inset-0 bg-black/35" />
          <div
            className="relative bg-white w-full max-w-md rounded-t-[20px] px-4 pt-4 pb-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[16px] font-bold text-gray-900">Comandos</span>
              <button
                onClick={() => setShowCommandsModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {[
                { cmd: "/status", label: "Meus robôs comprados" },
                { cmd: "/rendimento", label: "Próximo crédito diário" },
                { cmd: "/saldo", label: "Saldo da carteira" },
                { cmd: "/comprar", label: "Catálogo de robôs" },
                { cmd: "/ajuda", label: "Lista de comandos" },
              ].map(({ cmd, label }) => (
                <button
                  key={cmd}
                  onClick={() => { setShowCommandsModal(false); handleSendMessage(cmd); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer text-left"
                >
                  <span className="text-[#1a7ac7] font-medium text-[14px] min-w-[100px]">{cmd}</span>
                  <span className="text-gray-500 text-[13.5px]">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="w-full bg-white px-3 py-2 shrink-0 z-30 flex items-center gap-3 border-b border-gray-200/70"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        {/* Voltar */}
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-[#1c1c1e] hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors cursor-pointer shrink-0"
          aria-label="Voltar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>

        {/* Avatar + Info — clicáveis para consultar saldo */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" onClick={() => handleSendMessage("/saldo")}>
          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200">
            <img
              src="/botfather.png"
              alt="BotFather"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg";
              }}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-[16px] font-bold text-[#000000] leading-tight">BotFather</span>
              {/* Verified badge */}
              <svg className="w-[15px] h-[15px] text-[#3390ec] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span className="text-[11.5px] text-[#8a8a8e] truncate leading-tight">
              8,885,239 usuários mensais
            </span>
          </div>
        </div>

        {/* Três pontos */}
        <button
          onClick={() => setShowCommandsModal(true)}
          className="p-1.5 text-[#8a8a8e] hover:bg-gray-100 rounded-full cursor-pointer shrink-0"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* ── CHAT ── */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 relative select-text"
        style={{
          backgroundColor: "#afc8af",
          backgroundImage: DOODLE_BG,
        }}
      >
        {/* Chip de data */}
        <div className="flex justify-center my-2 select-none">
          <span
            className="text-white text-[12px] font-medium px-3.5 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(74, 100, 74, 0.72)", backdropFilter: "blur(4px)" }}
          >
            Wednesday
          </span>
        </div>

        {/* Mensagens */}
        {messages.map((msg) => {
          if (msg.sender === "user") {
            return <UserBubble key={msg.id} text={msg.text || ""} time={msg.time} />;
          }

          /* ── Balão do Bot ── */
          return (
            <BotBubble key={msg.id} time={msg.time}>
              {/* 1. Boas-vindas */}
              {msg.type === "welcome" && (
                <div className="text-[14px] text-[#1c1c1e] leading-relaxed font-normal">
                  <p className="mb-2 text-[14px] text-[#1c1c1e]">
                    Olá, eu sou o BOTFATHER! Posso te ajudar a consultar seu saldo, histórico de rendimentos, compras e suporte.
                  </p>
                  <p className="text-[13.5px]">
                    <span onClick={() => handleSendMessage("/status")} className="text-[#1a7ac7] underline cursor-pointer">Status</span>
                    {" · "}
                    <span onClick={() => handleSendMessage("/rendimento")} className="text-[#1a7ac7] underline cursor-pointer">Rendimento</span>
                    {" · "}
                    <span onClick={() => handleSendMessage("/saldo")} className="text-[#1a7ac7] underline cursor-pointer">Saldo</span>
                    {" · "}
                    <span onClick={() => handleSendMessage("/comprar")} className="text-[#1a7ac7] underline cursor-pointer">Comprar</span>
                    {" · "}
                    <span onClick={() => handleSendMessage("/ajuda")} className="text-[#1a7ac7] underline cursor-pointer">Ajuda</span>
                  </p>
                </div>
              )}

              {/* 2. Status dos Bots */}
              {msg.type === "status_report" && msg.payload?.bots && (
                <div className="text-[14px] text-[#1c1c1e] leading-relaxed">
                  <p className="font-bold text-[14.5px] mb-1.5">
                    Robôs em Execução ({msg.payload.bots.length}):
                  </p>
                  <div className="space-y-3">
                    {msg.payload.bots.map((bot: PurchasedBot, idx: number) => (
                      <div key={bot.id || idx} className="text-[13.5px] border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                        <p className="font-bold text-[#1c1c1e] mb-0.5">
                          {idx + 1}. {bot.produto_nome}{" "}
                          <span className="text-[#25ae60] text-[12px] font-semibold">● Ativo</span>
                        </p>
                        <p className="text-[#3a3a3c] text-[13px] space-y-0.5">
                          ID: <span className="font-mono text-[12px]">{bot.id?.slice(0, 8).toUpperCase()}</span><br />
                          Renda Diária: <span className="text-[#25ae60] font-semibold">+{formatCurrency(bot.renda_diaria, "KZ")}/dia</span><br />
                          Valor Pago: {formatCurrency(bot.preco_pago, "KZ")}<br />
                          Dias Restantes: {bot.dias_restantes} dias
                        </p>
                        {bot.ativo && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#2481cc]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Próximo crédito em:</span>
                            <PurchasedBotCountdown dataInicio={bot.data_inicio} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Contagem Regressiva */}
              {msg.type === "cycle_countdown" && msg.payload?.bots && (
                <div className="text-[14px] text-[#1c1c1e] leading-relaxed">
                  <p className="font-bold text-[14.5px] mb-1">Sincronização de Rendimento Diário</p>
                  <p className="text-[13px] text-[#3a3a3c] mb-2">Créditos automáticos a cada 24 horas:</p>
                  <div className="space-y-2">
                    {msg.payload.bots.map((bot: PurchasedBot, idx: number) => (
                      <div key={bot.id || idx} className="text-[13px] border-b border-gray-100 pb-1.5 last:border-0">
                        <p className="font-bold text-[#1c1c1e]">{bot.produto_nome}:</p>
                        <p>Crédito: <span className="text-[#25ae60] font-semibold">+{formatCurrency(bot.renda_diaria, "KZ")}</span></p>
                        <div className="flex items-center gap-1.5 text-[#2481cc] mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Tempo restante:</span>
                          <PurchasedBotCountdown dataInicio={bot.data_inicio} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Texto livre */}
              {msg.type === "text" && (
                <div className="text-[14px] text-[#1c1c1e] leading-relaxed whitespace-pre-line font-normal">
                  {renderTextWithLinks(msg.text || "")}
                </div>
              )}
            </BotBubble>
          );
        })}

        {/* Digitando */}
        {isTyping && (
          <div className="flex items-center gap-2 mb-2 pl-2">
            <div
              className="bg-white rounded-[18px] rounded-tl-[3px] px-3.5 py-2 flex items-center gap-1.5"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8a8a8e] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8a8a8e] animate-bounce" style={{ animationDelay: "160ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#8a8a8e] animate-bounce" style={{ animationDelay: "320ms" }} />
              <span className="text-[11.5px] text-[#8a8a8e] ml-1">BotFather está digitando...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {/* Scroll down */}
      {showScrollDown && (
        <button
          onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute right-3.5 bottom-16 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-[#8a8a8e] hover:bg-gray-50 active:scale-95 transition-all z-20 cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-white px-3 py-2 shrink-0 z-30 flex items-center gap-2.5 border-t border-gray-200">
        {/* Meus Bots — texto simples azul */}
        <button
          onClick={() => handleSendMessage("/status")}
          className="text-[#1a7ac7] text-[13.5px] font-medium shrink-0 cursor-pointer hover:underline"
        >
          Meus Bots
        </button>

        {/* Input */}
        <div className="flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSendMessage(); }
            }}
            placeholder="Digite um comando (/status, /saldo)..."
            className="w-full bg-transparent text-[15px] text-[#1c1c1e] placeholder-[#8a8a8e] outline-none"
          />
        </div>

        {/* Ajuda — texto simples azul */}
        <button
          onClick={() => handleSendMessage("/ajuda")}
          className="text-[#1a7ac7] text-[13.5px] font-medium shrink-0 cursor-pointer hover:underline"
        >
          Ajuda
        </button>

        {/* Enviar */}
        <button
          onClick={() => handleSendMessage()}
          className="w-9 h-9 rounded-full bg-[#3390ec] hover:bg-[#2881dc] active:scale-95 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer"
          aria-label="Enviar"
        >
          <Send className="w-[17px] h-[17px] -ml-0.5" />
        </button>
      </footer>
    </div>
  );
}
