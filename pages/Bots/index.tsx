import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MoreVertical,
  Send,
  Loader2,
  HelpCircle,
  Clock,
  ChevronDown
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { formatCurrency } from "../../lib/currency";

/* ─── Interfaces ─────────────────────────────────────────── */
export interface ProductItem {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  renda_diaria: number;
  duracao_dias: number;
  limite_compra?: number;
  imagem_url?: string;
  size?: string;
}

export interface PurchasedBotItem {
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
  type: "welcome" | "text" | "catalog" | "my_bots" | "single_bot" | "purchase_success";
  payload?: any;
}

/* ─── Lista de Comandos Válidos (para destacar em azul como Telegram oficial) ─── */
const VALID_COMMANDS = new Set([
  "/start",
  "/inicio",
  "/início",
  "/help",
  "/ajuda",
  "/menu",
  "/bots",
  "/catalogo",
  "/catálogo",
  "/comprar",
  "/loja",
  "/produtos",
  "/robos",
  "/robôs",
  "/meusbots",
  "/mybots",
  "/ativos",
  "/compras",
  "/minhascompras",
  "/saldo",
  "/carteira",
  "/rendas",
  "/historico",
  "/histórico",
  "/limites",
  "/limite",
  "/spam",
  "/spambot",
  "/skeddy",
  "/skeddybot",
  "/botfather",
  "/father",
  "/combot",
  "/com",
  "/ia",
  "/botsdeia",
  "/botia",
  "/premium",
  "/premiumbot",
  "/limpar",
  "/reset",
  "/clear"
]);

function isRecognizedCommand(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return false;
  const cmd = trimmed.split(/\s+/)[0].toLowerCase();
  return VALID_COMMANDS.has(cmd) || cmd.startsWith("/comprar_");
}

/* ─── Chave de Persistência no Dispositivo ─────────────────── */
const CHAT_STORAGE_KEY = "telegram_botfather_chat_v3";

/* ─── Helpers de Tempo ───────────────────────────────────── */
function getCurrentTime(): string {
  return new Date().toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
}

function getSecondsUntilNextCredit(dataInicio: string): number {
  try {
    const start = new Date(dataInicio);
    const now = new Date();
    const next = new Date();
    next.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  } catch {
    return 86400;
  }
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
    <span className="font-mono text-[12px] font-bold text-[#1e6dc8] tabular-nums bg-white px-1.5 py-0.5 rounded border border-[#d6e3f3]">
      {formatCountdown(sec)}
    </span>
  );
}

/* ─── Componente Principal: BotFather Oficial Telegram ───── */
export default function TelegramBotsChat() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [purchasedBots, setPurchasedBots] = useState<PurchasedBotItem[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Persistência local no dispositivo do usuário
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error("Erro ao salvar histórico do chat no dispositivo:", e);
      }
    }
  }, [messages]);

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  /* ── Buscar Dados Iniciais do Supabase ── */
  const loadData = useCallback(async () => {
    try {
      // 1. Produtos disponíveis
      const { data: prodsData } = await supabase.rpc("get_available_products_mcpn");
      const cleanProducts: ProductItem[] = Array.isArray(prodsData)
        ? prodsData.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            descricao: p.descricao || "",
            preco: Number(p.preco) || 0,
            renda_diaria: Number(p.renda_diaria) || 0,
            duracao_dias: Number(p.duracao_dias) || 90,
            limite_compra: p.limite_compra || 99,
            imagem_url: p.imagem_url || "",
            size: p.size || "Cloud"
          }))
        : [];
      setProducts(cleanProducts);

      // 2. Bots comprados
      const { data: myData } = await supabase.rpc("get_my_purchased_products_mcpn");
      const cleanPurchased: PurchasedBotItem[] = Array.isArray(myData)
        ? myData.map((b: any) => ({
            id: b.id,
            preco_pago: Number(b.preco_pago) || 0,
            renda_diaria: Number(b.renda_diaria) || 0,
            data_inicio: b.data_inicio,
            data_fim: b.data_fim,
            dias_restantes: b.dias_restantes || 0,
            ativo: Boolean(b.ativo),
            produto_nome: b.produto_nome,
            produto_imagem: b.produto_imagem || "",
            storage_size: b.storage_size || ""
          }))
        : [];
      setPurchasedBots(cleanPurchased);

      // 3. Saldo do usuário
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const { data: userData } = await supabase
          .from("sys_t500")
          .select("saldo_disponivel")
          .eq("id", sessionData.session.user.id)
          .single();
        if (userData) {
          setUserBalance(Number(userData.saldo_disponivel) || 0);
        }
      }

      return { cleanProducts, cleanPurchased };
    } catch (err) {
      console.error("Erro ao carregar dados do BotFather:", err);
      return { cleanProducts: [], cleanPurchased: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Inicialização com Persistência no Dispositivo ── */
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    async function initConversation() {
      await loadData();

      // Verificar se já temos mensagens salvas no dispositivo
      try {
        const saved = localStorage.getItem(CHAT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            return;
          }
        }
      } catch (e) {
        console.error("Erro ao restaurar histórico salvo:", e);
      }

      // Se não tiver mensagens salvas, exibir mensagem única de tutorial inicial
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: "welcome-botfather",
            sender: "bot",
            time: getCurrentTime(),
            type: "welcome"
          }
        ]);
      }, 500);
    }

    initConversation();
  }, [loadData]);

  /* ── Simulação de Resposta do BotFather ── */
  const simulateBotReply = useCallback((builder: () => ChatMessage, delay = 650) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, builder()]);
    }, delay);
  }, []);

  /* ── Tratar Comandos e Mensagens do Usuário ── */
  const handleSendMessage = useCallback(
    (textToSend?: string) => {
      const content = (textToSend || inputText).trim();
      if (!content) return;

      const userMsg: ChatMessage = {
        id: "usr-" + Date.now(),
        sender: "user",
        time: getCurrentTime(),
        text: content,
        type: "text"
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText("");

      const normalized = content.toLowerCase().replace(/^\//, "").trim();

      // Helper para contagem de compras de um produto específico
      const getPurchasedCountForProduct = (prod: ProductItem) => {
        return purchasedBots.filter(
          (b) =>
            b.produto_nome?.trim().toLowerCase() === prod.nome?.trim().toLowerCase() ||
            b.produto_nome?.toLowerCase().includes(prod.nome.toLowerCase().replace(/\s+bot/i, ""))
        ).length;
      };

      // 1. Comando Início / Ajuda (sem conversa humana, estritamente comandos)
      if (
        normalized === "start" ||
        normalized === "inicio" ||
        normalized === "início" ||
        normalized === "help" ||
        normalized === "ajuda" ||
        normalized === "menu" ||
        normalized === "comandos"
      ) {
        simulateBotReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: getCurrentTime(),
          type: "welcome"
        }));
        return;
      }

      // 2. Comando Ver Bots / Catálogo / Comprar
      if (
        normalized === "bots" ||
        normalized === "catalogo" ||
        normalized === "catálogo" ||
        normalized === "comprar" ||
        normalized === "newbot" ||
        normalized === "produtos" ||
        normalized === "loja" ||
        normalized === "robos" ||
        normalized === "robôs"
      ) {
        simulateBotReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: getCurrentTime(),
          type: "catalog",
          payload: { products }
        }));
        return;
      }

      // 3. Comando Meus Bots Comprados / Ativos
      if (
        normalized === "meusbots" ||
        normalized === "mybots" ||
        normalized === "ativos" ||
        normalized === "compras" ||
        normalized === "minhascompras"
      ) {
        simulateBotReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: getCurrentTime(),
          type: "my_bots",
          payload: { bots: purchasedBots }
        }));
        return;
      }

      // 4. Comando Saldo (resposta direta e concisa, sem asteriscos ou textos extras)
      if (normalized === "saldo" || normalized === "carteira") {
        simulateBotReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: getCurrentTime(),
          type: "text",
          text: `Saldo disponível na carteira: ${formatCurrency(userBalance, "KZ")}. Envie /bots para ver o catálogo.`
        }));
        return;
      }

      // 5. Comando Limites de Compra (direto, sem asteriscos ou cardinais)
      if (normalized === "limites" || normalized === "limite") {
        const limitsText = products
          .map((prod) => {
            const bought = getPurchasedCountForProduct(prod);
            const maxLimit = prod.limite_compra || 1;
            const status = bought >= maxLimit ? "Esgotado" : `${maxLimit - bought} disponível(is)`;
            return `• ${prod.nome}: ${bought}/${maxLimit} comprados (${status})`;
          })
          .join("\n");

        simulateBotReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: getCurrentTime(),
          type: "text",
          text: `Limites de compra por robô:\n\n${limitsText}\n\nEnvie /bots para ver o catálogo.`
        }));
        return;
      }

      // 6. Comando Histórico de Rendas (direto e conciso)
      if (
        normalized === "rendas" ||
        normalized === "historico" ||
        normalized === "histórico"
      ) {
        const activeBots = purchasedBots.filter((b) => b.ativo);
        const totalDaily = activeBots.reduce((acc, b) => acc + b.renda_diaria, 0);
        const totalInvested = activeBots.reduce((acc, b) => acc + b.preco_pago, 0);

        if (activeBots.length === 0) {
          simulateBotReply(() => ({
            id: "bot-" + Date.now(),
            sender: "bot",
            time: getCurrentTime(),
            type: "text",
            text: `Você não possui robôs ativos no momento. Envie /bots para ver as opções disponíveis.`
          }));
          return;
        }

        const botsSummary = activeBots
          .map(
            (b) =>
              `• ${b.produto_nome}: +${formatCurrency(b.renda_diaria, "KZ")}/dia (${b.dias_restantes} dias restantes)`
          )
          .join("\n");

        simulateBotReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: getCurrentTime(),
          type: "text",
          text: `Rendimentos ativos:\n• Robôs ativos: ${activeBots.length}\n• Renda diária total: +${formatCurrency(totalDaily, "KZ")}/dia\n• Total investido: ${formatCurrency(totalInvested, "KZ")}\n\nDetalhamento:\n${botsSummary}`
        }));
        return;
      }

      // 7. Comando Limpar Chat
      if (normalized === "limpar" || normalized === "reset" || normalized === "clear") {
        try {
          localStorage.removeItem(CHAT_STORAGE_KEY);
        } catch (e) {
          console.error("Erro ao limpar storage:", e);
        }
        setMessages([
          {
            id: "welcome-botfather-" + Date.now(),
            sender: "bot",
            time: getCurrentTime(),
            type: "welcome"
          }
        ]);
        showToast("Histórico de conversa reiniciado.", "success");
        return;
      }

      // 8. Consulta de Robô Específico por Comando (/spam, /skeddy, /botfather, /combot, /ia, /premium)
      let cleanQuery = normalized
        .replace(/^info\s+/i, "")
        .replace(/^bot\s+/i, "")
        .replace(/\s+bot$/i, "")
        .trim();

      if (cleanQuery === "ia" || cleanQuery === "botsdeia" || cleanQuery === "botia") cleanQuery = "ia";
      if (cleanQuery === "father" || cleanQuery === "botfather") cleanQuery = "botfother";

      const matchedProd = products.find((p) => {
        const pNome = p.nome.toLowerCase();
        const pClean = pNome.replace(/\s+bot/i, "").trim();
        const pNoSpace = pNome.replace(/\s+/g, "");
        return (
          cleanQuery === pNome ||
          cleanQuery === pClean ||
          cleanQuery === pNoSpace ||
          (cleanQuery.length >= 3 && (pNome.includes(cleanQuery) || pClean.includes(cleanQuery)))
        );
      });

      if (matchedProd) {
        const boughtCount = getPurchasedCountForProduct(matchedProd);
        const maxLimit = matchedProd.limite_compra || 1;
        const remaining = Math.max(0, maxLimit - boughtCount);

        simulateBotReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: getCurrentTime(),
          type: "single_bot",
          payload: {
            product: matchedProd,
            boughtCount,
            maxLimit,
            remaining
          }
        }));
        return;
      }

      // 9. Fallback: Estritamente Comandos (Não conversa como humano)
      simulateBotReply(() => ({
        id: "bot-" + Date.now(),
        sender: "bot",
        time: getCurrentTime(),
        type: "text",
        text: `Comando não reconhecido. Envie /ajuda para ver a lista de comandos disponíveis.`
      }));
    },
    [inputText, products, purchasedBots, userBalance, simulateBotReply]
  );

  /* ── Ação de Compra de Bot Direto no Chat ── */
  const handleBuyProduct = useCallback(
    async (product: ProductItem) => {
      setBuyingId(product.id);

      const userMsg: ChatMessage = {
        id: "buy-usr-" + Date.now(),
        sender: "user",
        time: getCurrentTime(),
        text: `/comprar_${product.nome.toLowerCase().replace(/\s+/g, "_")}`,
        type: "text"
      };
      setMessages((prev) => [...prev, userMsg]);

      setIsTyping(true);

      try {
        const { data, error } = await supabase.rpc("buy_product_mcpn", {
          p_product_id: product.id
        });

        if (error) throw error;

        const result = data as { success: boolean; message: string };

        if (result?.success) {
          showToast(result.message, "success");

          // Atualiza dados
          await loadData();

          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: "success-" + Date.now(),
              sender: "bot",
              time: getCurrentTime(),
              type: "purchase_success",
              payload: { product }
            }
          ]);
        } else {
          setIsTyping(false);
          const raw = (result?.message || "Falha ao processar compra.").replace(/[*#]/g, "");
          const isNoBalance = /saldo\s+insuficiente/i.test(raw);

          setMessages((prev) => [
            ...prev,
            {
              id: "err-" + Date.now(),
              sender: "bot",
              time: getCurrentTime(),
              type: "text",
              text: isNoBalance
                ? `Saldo insuficiente. O robô custa ${formatCurrency(
                    product.preco,
                    "KZ"
                  )} e seu saldo atual é de ${formatCurrency(
                    userBalance,
                    "KZ"
                  )}. Recarregue sua carteira para continuar.`
                : `Erro: ${raw}`
            }
          ]);

          showToast(isNoBalance ? "Saldo insuficiente, recarregue primeiro." : raw, "error");
        }
      } catch (err: any) {
        setIsTyping(false);
        const raw = (err.message || "Erro de conexão ao comprar bot.").replace(/[*#]/g, "");
        setMessages((prev) => [
          ...prev,
          {
            id: "err-catch-" + Date.now(),
            sender: "bot",
            time: getCurrentTime(),
            type: "text",
            text: `Erro ao ativar robô: ${raw}`
          }
        ]);
        showToast(raw, "error");
      } finally {
        setBuyingId(null);
      }
    },
    [loadData, showToast, userBalance]
  );

  return (
    <div
      className="w-full h-[100dvh] flex flex-col overflow-hidden select-none"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif"
      }}
    >
      {/* ── HEADER TELEGRAM BOTFATHER ── */}
      <header className="w-full bg-white px-3 py-2 shrink-0 z-30 flex items-center justify-between border-b border-gray-200/60 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-[#000000] hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors cursor-pointer relative"
            aria-label="Voltar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#3390ec] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              1
            </span>
          </button>

          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 shadow-2xs">
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
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] font-bold text-[#000000] leading-tight">
                BotFather
              </span>
              <svg className="w-4 h-4 text-[#3390ec]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <span
              onClick={() => handleSendMessage("/saldo")}
              className="text-[12px] text-[#707579] truncate cursor-pointer hover:text-[#3390ec] transition-colors"
            >
              Saldo: {formatCurrency(userBalance, "KZ")}
            </span>
          </div>
        </div>

        <button className="p-1.5 text-[#707579] hover:bg-gray-100 rounded-full cursor-pointer">
          <MoreVertical className="w-5 h-5" />
        </button>
      </header>

      {/* ── CORPO DO CHAT COM WALLPAPER OFICIAL TELEGRAM ── */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2 relative select-text"
        style={{
          backgroundColor: "#8ea78f",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236f8a70' fill-opacity='0.22'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {/* Chip de data */}
        <div className="flex justify-center my-1 select-none">
          <span className="bg-[#5b7a5e]/70 text-white text-[11.5px] font-medium px-3 py-0.5 rounded-full shadow-2xs backdrop-blur-xs">
            Wednesday
          </span>
        </div>

        {/* Mensagens */}
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          if (isUser) {
            const isCmd = msg.text?.trim().startsWith("/");
            const isValid = isCmd && isRecognizedCommand(msg.text || "");

            return (
              <div key={msg.id} className="flex justify-end mb-1">
                <div
                  className="bg-[#effdde] rounded-[16px] rounded-br-[4px] px-3.5 py-1.5 max-w-[85%] relative select-text flex items-baseline gap-2"
                  style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
                >
                  <p
                    className={`text-[15px] leading-snug whitespace-pre-line ${
                      isValid ? "text-[#2481cc] font-medium" : "text-[#000000] font-normal"
                    }`}
                  >
                    {msg.text}
                  </p>
                  <div className="flex items-center gap-1 shrink-0 text-[11px] text-[#537c3e] select-none ml-1">
                    <span>{msg.time}</span>
                    <span className="text-[#3ca3e8] font-bold text-[12px] leading-none">✓✓</span>
                  </div>
                </div>
              </div>
            );
          }

          // Mensagens do BotFather (Texto limpo)
          return (
            <div key={msg.id} className="flex flex-col items-start mb-2 max-w-[92%] sm:max-w-[85%]">
              <div
                className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2.5 text-gray-900 w-full relative select-text"
                style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
              >
                {/* 1. Guia Oficial de Comandos do BotFather */}
                {msg.type === "welcome" && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] mb-1.5 text-gray-900">
                      BotFather - Central de Comandos
                    </p>
                    <p className="mb-2 text-gray-700">
                      Envie um dos comandos abaixo para interagir:
                    </p>
                    <div className="space-y-1 mb-2.5">
                      <div>• <span onClick={() => handleSendMessage("/bots")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/bots</span> — Catálogo de robôs</div>
                      <div>• <span onClick={() => handleSendMessage("/saldo")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/saldo</span> — Saldo disponível</div>
                      <div>• <span onClick={() => handleSendMessage("/meusbots")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/meusbots</span> — Robôs ativos</div>
                      <div>• <span onClick={() => handleSendMessage("/limites")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/limites</span> — Limites por robô</div>
                      <div>• <span onClick={() => handleSendMessage("/rendas")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/rendas</span> — Rendimentos diários</div>
                      <div>• <span onClick={() => handleSendMessage("/limpar")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/limpar</span> — Limpar conversa</div>
                      <div>• <span onClick={() => handleSendMessage("/ajuda")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/ajuda</span> — Lista de comandos</div>
                    </div>
                    <p className="font-bold text-[13.5px] text-gray-900 mb-1">
                      Consultar robô individual:
                    </p>
                    <p className="text-[13px] text-gray-600">
                      <span onClick={() => handleSendMessage("/spam")} className="text-[#3390ec] cursor-pointer hover:underline">/spam</span>,{" "}
                      <span onClick={() => handleSendMessage("/skeddy")} className="text-[#3390ec] cursor-pointer hover:underline">/skeddy</span>,{" "}
                      <span onClick={() => handleSendMessage("/botfather")} className="text-[#3390ec] cursor-pointer hover:underline">/botfather</span>,{" "}
                      <span onClick={() => handleSendMessage("/combot")} className="text-[#3390ec] cursor-pointer hover:underline">/combot</span>,{" "}
                      <span onClick={() => handleSendMessage("/ia")} className="text-[#3390ec] cursor-pointer hover:underline">/ia</span>,{" "}
                      <span onClick={() => handleSendMessage("/premium")} className="text-[#3390ec] cursor-pointer hover:underline">/premium</span>
                    </p>
                  </div>
                )}

                {/* 2. Meus Bots Comprados */}
                {msg.type === "my_bots" && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] mb-1.5">
                      Robôs em Execução ({msg.payload?.bots?.length || 0}):
                    </p>

                    {!msg.payload?.bots || msg.payload.bots.length === 0 ? (
                      <p className="text-gray-600">
                        Você não possui robôs comprados. Envie <span onClick={() => handleSendMessage("/bots")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/bots</span> para abrir o catálogo.
                      </p>
                    ) : (
                      <div className="space-y-2.5 my-1">
                        {msg.payload.bots.map((bot: PurchasedBotItem, idx: number) => (
                          <div key={bot.id || idx} className="text-[13.5px] leading-relaxed border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                            <p className="font-bold text-gray-900">
                              {idx + 1}. {bot.produto_nome} <span className="text-[#25ae60] text-[12px] font-semibold">• Ativo</span>
                            </p>
                            <p className="text-gray-600">
                              • ID Contrato: <span className="font-mono text-[12px] text-gray-800">{bot.id?.slice(0, 6).toUpperCase()}</span>
                              <br />
                              • Renda Diária: <span className="text-[#25ae60] font-semibold">+{formatCurrency(bot.renda_diaria, "KZ")}</span> / dia
                              <br />
                              • Valor Pago: {formatCurrency(bot.preco_pago, "KZ")}
                              <br />
                              • Dias Restantes: {bot.dias_restantes} dias
                            </p>
                            {bot.ativo && (
                              <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#2481cc]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Próximo crédito em:</span>
                                <PurchasedBotCountdown dataInicio={bot.data_inicio} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Catálogo de Bots */}
                {msg.type === "catalog" && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] mb-1.5">
                      Robôs Disponíveis para Compra:
                    </p>
                    <div className="space-y-2 mb-1">
                      {msg.payload?.products?.map((prod: ProductItem, idx: number) => (
                        <div key={prod.id || idx} className="text-[13.5px] text-gray-800">
                          <span className="font-bold">{idx + 1}. {prod.nome}</span> — {formatCurrency(prod.preco, "KZ")}
                          <br />
                          <span className="text-gray-500 text-[12.5px]">
                            Renda: <span className="text-[#25ae60] font-medium">+{formatCurrency(prod.renda_diaria, "KZ")}/dia</span> • Duração: {prod.duracao_dias} dias • Renda Total: {formatCurrency(prod.renda_diaria * prod.duracao_dias, "KZ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Detalhe de Bot Específico */}
                {msg.type === "single_bot" && msg.payload?.product && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] text-[#2481cc] mb-1.5">
                      Informações do {msg.payload.product.nome}:
                    </p>
                    <p className="text-[13.5px] text-gray-800 space-y-1 my-1">
                      • Preço de Compra: {formatCurrency(msg.payload.product.preco, "KZ")}
                      <br />
                      • Renda Diária: <span className="text-[#25ae60] font-semibold">+{formatCurrency(msg.payload.product.renda_diaria, "KZ")} / dia</span>
                      <br />
                      • Duração do Contrato: {msg.payload.product.duracao_dias} dias
                      <br />
                      • Renda Total no Período: <span className="text-[#2481cc] font-semibold">{formatCurrency(msg.payload.product.renda_diaria * msg.payload.product.duracao_dias, "KZ")}</span>
                      <br />
                      • Limite de Compras:{" "}
                      {msg.payload.boughtCount >= msg.payload.maxLimit ? (
                        <span className="text-amber-600 font-semibold">
                          Limite atingido ({msg.payload.boughtCount}/{msg.payload.maxLimit} comprados)
                        </span>
                      ) : (
                        <span>
                          {msg.payload.boughtCount}/{msg.payload.maxLimit} comprados ({msg.payload.remaining} disponível)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* 5. Sucesso de Compra */}
                {msg.type === "purchase_success" && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[#25ae60] text-[15px] mb-1">
                      Robô Comprado com Sucesso!
                    </p>
                    <p className="mb-1 text-gray-700">
                      Chave de Ativação do Robô (HTTP API):
                    </p>
                    <div className="bg-[#e8eff5] rounded-[8px] px-2.5 py-1 font-mono text-[12.5px] text-[#2481cc] select-all my-1.5">
                      8723751541:AAF1i3n8zKtRJd5_mJmVDw0vQvJhMjzUjWU
                    </div>
                    <p className="text-[13px] text-gray-600">
                      O robô <span className="font-semibold">{msg.payload?.product?.nome}</span> está ativo. Rendimento de <span className="font-semibold text-[#25ae60]">+{formatCurrency(msg.payload?.product?.renda_diaria, "KZ")}</span> creditado diariamente a cada 24 horas no saldo.
                    </p>
                  </div>
                )}

                {/* 6. Texto livre sem asteriscos ou cardinais */}
                {msg.type === "text" && (
                  <div className="text-[14px] text-[#000000] leading-relaxed whitespace-pre-line font-normal">
                    {msg.text
                      ?.replace(/[*#]/g, "")
                      .split("\n")
                      .map((line, lIdx) => {
                        const parts = line.split(/(\/[-_a-zA-Z0-9]+)/g);
                        return (
                          <span key={lIdx}>
                            {parts.map((part, pIdx) => {
                              if (part.startsWith("/")) {
                                return (
                                  <span
                                    key={pIdx}
                                    onClick={() => handleSendMessage(part)}
                                    className="text-[#3390ec] font-medium cursor-pointer hover:underline"
                                  >
                                    {part}
                                  </span>
                                );
                              }
                              return part;
                            })}
                            {lIdx < (msg.text?.replace(/[*#]/g, "").split("\n").length || 1) - 1 && <br />}
                          </span>
                        );
                      })}
                  </div>
                )}

                <div className="flex justify-end mt-1 text-[11px] text-[#707579] font-normal select-none">
                  <span>{msg.time}</span>
                </div>
              </div>

              {/* Botão Inline no Welcome para Ver Catálogo */}
              {msg.type === "welcome" && (
                <div className="w-full mt-1.5 select-none">
                  <button
                    onClick={() => handleSendMessage("/bots")}
                    className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2.5 px-3 text-center text-[13.5px] font-bold text-[#2481cc] transition-colors cursor-pointer flex items-center justify-center gap-2"
                    style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
                  >
                    <span>🛍️ Ver Robôs Disponíveis para Compra</span>
                  </button>
                </div>
              )}

              {/* Botões Inline do Catálogo */}
              {msg.type === "catalog" && msg.payload?.products && (
                <div className="w-full mt-1.5 space-y-1 select-none">
                  {msg.payload.products.map((prod: ProductItem) => {
                    const isBuyingThis = buyingId === prod.id;
                    return (
                      <button
                        key={"btn-" + prod.id}
                        onClick={() => handleBuyProduct(prod)}
                        disabled={isBuyingThis}
                        className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2 px-3 text-center text-[13.5px] font-semibold text-[#2481cc] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
                      >
                        {isBuyingThis ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-[#2481cc]" />
                            <span>Comprando robô...</span>
                          </>
                        ) : (
                          <span>🛒 Comprar {prod.nome} — {formatCurrency(prod.preco, "KZ")}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Botão Inline para um bot específico */}
              {msg.type === "single_bot" && msg.payload?.product && (
                <div className="w-full mt-1.5 select-none">
                  {msg.payload.remaining <= 0 ? (
                    <div
                      className="w-full bg-gray-100 rounded-[8px] py-2 px-3 text-center text-[13px] font-semibold text-gray-500"
                      style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
                    >
                      ⚠️ Limite de compras atingido para este robô
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuyProduct(msg.payload.product)}
                      disabled={buyingId === msg.payload.product.id}
                      className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 rounded-[8px] py-2 px-3 text-center text-[13.5px] font-semibold text-[#2481cc] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                      style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
                    >
                      {buyingId === msg.payload.product.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#2481cc]" />
                          <span>Comprando robô...</span>
                        </>
                      ) : (
                        <span>🛒 Comprar {msg.payload.product.nome} — {formatCurrency(msg.payload.product.preco, "KZ")}</span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Indicador de Digitando */}
        {isTyping && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div
              className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2 flex items-center gap-1.5"
              style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#707579] animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-[11.5px] text-[#707579] ml-1">BotFather está digitando...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {/* Botão flutuante para rolar para baixo */}
      {showScrollDown && (
        <button
          onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute right-3.5 bottom-16 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-[#707579] hover:bg-gray-50 active:scale-95 transition-all z-20 cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* ── BARRA INFERIOR DE INPUT TELEGRAM ── */}
      <footer className="bg-white px-2 py-2 shrink-0 z-30 flex items-center gap-2 border-t border-gray-200">
        <button
          onClick={() => handleSendMessage("/meusbots")}
          className="h-[38px] px-3.5 rounded-[8px] bg-[#3390ec] hover:bg-[#2881dc] active:bg-[#1d6fae] text-white text-[13.5px] font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          <span>Meus Bots</span>
        </button>

        <div className="flex-1 flex items-center bg-transparent px-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Digite um comando (/bots, /saldo)..."
            className="w-full bg-transparent text-[15px] text-[#000000] placeholder-gray-400 outline-none"
          />
        </div>

        <button
          onClick={() => handleSendMessage("/ajuda")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#707579] hover:text-[#3390ec] hover:bg-gray-100 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Ajuda e Comandos"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleSendMessage()}
          className="w-10 h-10 rounded-full bg-[#3390ec] hover:bg-[#2881dc] active:scale-95 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs"
          aria-label="Enviar mensagem"
        >
          <Send className="w-4 h-4 -ml-0.5" />
        </button>
      </footer>
    </div>
  );
}
