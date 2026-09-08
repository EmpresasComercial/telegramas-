import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { formatCurrency } from "../lib/currency";
import {
  MoreVertical,
  Send,
  Loader2,
  Paperclip,
  Smile,
  Mic,
  Clock,
  ChevronDown
} from "lucide-react";
import { useToast } from "../components/Toast";

/* ── Interfaces ───────────────────────────────────────────── */
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

/* ── Helpers de Tempo ─────────────────────────────────────── */
function nowTime() {
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

/* ── Componente Principal: Chatbot do Bot Comprado (BotFather) ── */
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

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (!mainChatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainChatRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  };

  /* ── Buscar Bots Comprados e Saldo ── */
  const fetchPurchasedBots = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_my_purchased_products_mcpn");
      if (error) throw error;

      let clean: PurchasedBot[] = [];
      if (data && Array.isArray(data)) {
        clean = data.map((b: any) => ({
          id: b.id,
          preco_pago: Number(b.preco_pago) || 0,
          renda_diaria: Number(b.renda_diaria) || 0,
          data_inicio: b.data_inicio,
          data_fim: b.data_fim,
          dias_restantes: b.dias_restantes || 0,
          ativo: Boolean(b.ativo),
          produto_nome: b.produto_nome || "Spam Bot",
          produto_imagem: b.produto_imagem || "",
          storage_size: b.storage_size || ""
        }));
        setPurchasedBots(clean);
      }

      // Saldo do usuário
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

      return clean;
    } catch (err) {
      console.error("Erro ao carregar bots comprados:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Iniciar conversa com Mensagem Única de Boas-vindas e Tutorial ── */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initChat() {
      const bots = await fetchPurchasedBots();

      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);

        // Apenas UMA mensagem de tutorial inicial, sem duplicatas
        setMessages([
          {
            id: "welcome-init",
            sender: "bot",
            time: nowTime(),
            type: "welcome",
            payload: { activeCount: bots.filter((b) => b.ativo).length }
          }
        ]);
      }, 500);
    }

    initChat();
  }, [fetchPurchasedBots]);

  /* ── Simular resposta do BotFather ── */
  const botReply = useCallback((builder: () => ChatMessage, delay = 650) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [...prev, builder()]);
    }, delay);
  }, []);

  /* ── Enviar mensagem para o BotFather ── */
  const handleSendMessage = useCallback(
    (textToSend?: string) => {
      const content = (textToSend || inputText).trim();
      if (!content) return;

      const userMsg: ChatMessage = {
        id: "usr-" + Date.now(),
        sender: "user",
        time: nowTime(),
        text: content,
        type: "text"
      };

      setMessages((prev) => [...prev, userMsg]);
      if (!textToSend) setInputText("");

      const normalized = content.toLowerCase().replace(/^\//, "").trim();

      if (
        normalized === "start" ||
        normalized === "inicio" ||
        normalized === "início" ||
        normalized === "help" ||
        normalized === "ajuda" ||
        normalized === "menu" ||
        normalized === "comandos"
      ) {
        botReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: nowTime(),
          type: "welcome",
          payload: { activeCount: purchasedBots.filter((b) => b.ativo).length }
        }));
        return;
      }

      if (
        normalized === "status" ||
        normalized === "meusbots" ||
        normalized === "mybots" ||
        normalized === "ativos"
      ) {
        if (!purchasedBots || purchasedBots.length === 0) {
          botReply(() => ({
            id: "bot-" + Date.now(),
            sender: "bot",
            time: nowTime(),
            type: "text",
            text: `Você não possui robôs comprados. Envie /comprar para abrir o catálogo.`
          }));
          return;
        }

        botReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: nowTime(),
          type: "status_report",
          payload: { bots: purchasedBots }
        }));
        return;
      }

      if (normalized === "rendimento" || normalized === "proximo" || normalized === "ciclo") {
        if (!purchasedBots || purchasedBots.length === 0) {
          botReply(() => ({
            id: "bot-" + Date.now(),
            sender: "bot",
            time: nowTime(),
            type: "text",
            text: `Você não possui rendimentos ativos. Envie /comprar para adquirir um robô.`
          }));
          return;
        }

        botReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: nowTime(),
          type: "cycle_countdown",
          payload: { bots: purchasedBots }
        }));
        return;
      }

      if (normalized === "saldo" || normalized === "carteira") {
        botReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: nowTime(),
          type: "text",
          text: `Saldo disponível na carteira: ${formatCurrency(userBalance, "KZ")}. Envie /comprar para ver os robôs.`
        }));
        return;
      }

      if (normalized === "comprar" || normalized === "bots" || normalized === "catalogo") {
        botReply(() => ({
          id: "bot-" + Date.now(),
          sender: "bot",
          time: nowTime(),
          type: "text",
          text: "Abrindo o catálogo de robôs disponíveis para compra..."
        }));
        setTimeout(() => navigate("/bot-pay"), 900);
        return;
      }

      // Fallback estritamente baseado em comandos (não conversa como humano)
      botReply(() => ({
        id: "bot-" + Date.now(),
        sender: "bot",
        time: nowTime(),
        type: "text",
        text: `Comando não reconhecido. Envie /ajuda para ver a lista de comandos disponíveis.`
      }));
    },
    [botReply, inputText, navigate, purchasedBots, userBalance]
  );

  return (
    <div
      className="w-full h-[100dvh] flex flex-col overflow-hidden select-none"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif" }}
    >
      {/* ── HEADER OFICIAL DO BOTFATHER ── */}
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

      {/* ── CORPO DO CHAT COM WALLPAPER OFICIAL TELEGRAM VERDE ── */}
      <main
        ref={mainChatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2 relative select-text"
        style={{
          backgroundColor: "#8ea78f",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236f8a70' fill-opacity='0.22'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        <div className="flex justify-center my-1 select-none">
          <span className="bg-[#5b7a5e]/70 text-white text-[11.5px] font-medium px-3 py-0.5 rounded-full shadow-2xs backdrop-blur-xs">
            Wednesday
          </span>
        </div>

        {/* Mensagens do chat */}
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end mb-1">
                <div
                  className="bg-[#effdde] rounded-[16px] rounded-br-[3px] px-3.5 py-2 max-w-[85%] relative select-text"
                  style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
                >
                  <p className="text-[14.5px] text-[#000000] leading-snug font-normal whitespace-pre-line">
                    {msg.text}
                  </p>
                  <div className="flex justify-end items-center gap-1 mt-0.5 text-[11px] text-[#537c3e] select-none">
                    <span>{msg.time}</span>
                    <span className="text-[#3ca3e8] font-bold text-[12px] leading-none">✓✓</span>
                  </div>
                </div>
              </div>
            );
          }

          // Balão do BotFather (Texto Puro limpo, sem subcards)
          return (
            <div key={msg.id} className="flex flex-col items-start mb-2 max-w-[92%] sm:max-w-[85%]">
              <div
                className="bg-white rounded-[16px] rounded-bl-[3px] px-3.5 py-2.5 text-gray-900 w-full relative select-text"
                style={{ boxShadow: "0 1px 2px rgba(16, 35, 47, 0.15)" }}
              >
                {/* 1. Guia de Comandos do BotFather */}
                {msg.type === "welcome" && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] mb-1.5 text-gray-900">
                      BotFather - Gestão de Robôs
                    </p>
                    <p className="mb-2 text-gray-700">
                      Envie um dos comandos para consultar:
                    </p>
                    <div className="space-y-1 mb-2.5">
                      <div>• <span onClick={() => handleSendMessage("/status")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/status</span> — Robôs comprados</div>
                      <div>• <span onClick={() => handleSendMessage("/rendimento")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/rendimento</span> — Próximo crédito diário</div>
                      <div>• <span onClick={() => handleSendMessage("/saldo")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/saldo</span> — Saldo da carteira</div>
                      <div>• <span onClick={() => handleSendMessage("/comprar")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/comprar</span> — Catálogo de robôs</div>
                      <div>• <span onClick={() => handleSendMessage("/ajuda")} className="text-[#3390ec] font-medium cursor-pointer hover:underline">/ajuda</span> — Lista de comandos</div>
                    </div>
                    <p className="text-[#707579] text-[13px] pt-1 border-t border-gray-100">
                      Você possui {msg.payload?.activeCount || 0} robô(s) ativo(s).
                    </p>
                  </div>
                )}

                {/* 2. Relatório de Status dos Bots Comprados */}
                {msg.type === "status_report" && msg.payload?.bots && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] mb-1.5">
                      Robôs em Execução ({msg.payload.bots.length}):
                    </p>
                    <div className="space-y-2.5 my-1">
                      {msg.payload.bots.map((bot: PurchasedBot, idx: number) => (
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
                  </div>
                )}

                {/* 3. Contagem Regressiva do Ciclo */}
                {msg.type === "cycle_countdown" && msg.payload?.bots && (
                  <div className="text-[14px] text-gray-950 leading-relaxed font-normal">
                    <p className="font-bold text-[15px] mb-1.5">
                      Sincronização de Rendimento Diário
                    </p>
                    <p className="text-[13px] text-gray-700 mb-2">
                      Créditos automáticos a cada 24 horas:
                    </p>
                    <div className="space-y-2 my-1">
                      {msg.payload.bots.map((bot: PurchasedBot, idx: number) => (
                        <div key={bot.id || idx} className="text-[13px] border-b border-gray-100 pb-1.5 last:border-0">
                          <p className="font-bold text-gray-900">{bot.produto_nome}:</p>
                          <p>• Crédito: <span className="text-[#25ae60] font-semibold">+{formatCurrency(bot.renda_diaria, "KZ")}</span></p>
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

                {/* 4. Mensagem de Texto (sem asteriscos ou cardinais) */}
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

      {/* Botão flutuante de rolagem */}
      {showScrollDown && (
        <button
          onClick={() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute right-3.5 bottom-16 w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-[#707579] hover:bg-gray-50 active:scale-95 transition-all z-20 cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* ── BARRA INFERIOR DE INPUT OFICIAL ── */}
      <footer className="bg-white px-2 py-2 shrink-0 z-30 flex items-center gap-2 border-t border-gray-200">
        <button
          onClick={() => navigate("/bot-pay")}
          className="h-[38px] px-3 rounded-[8px] bg-[#3390ec] hover:bg-[#2881dc] active:bg-[#1d6fae] text-white text-[13.5px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          <span>Catálogo</span>
        </button>

        <button
          onClick={() => handleSendMessage("/status")}
          className="p-1.5 text-[#707579] hover:text-[#000000] active:scale-90 transition-transform cursor-pointer"
          title="Status dos Bots"
        >
          <Paperclip className="w-5 h-5 -rotate-45" />
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
            placeholder="Digite um comando (/status, /saldo)..."
            className="w-full bg-transparent text-[15px] text-[#000000] placeholder-gray-400 outline-none"
          />
        </div>

        <button
          onClick={() => handleSendMessage("/ajuda")}
          className="p-1.5 text-[#707579] hover:text-[#000000] active:scale-90 transition-transform cursor-pointer"
          title="Ajuda"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleSendMessage()}
          className="w-10 h-10 rounded-full bg-[#3390ec] hover:bg-[#2881dc] active:scale-95 text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs"
          aria-label={inputText.trim() ? "Enviar mensagem" : "Mensagem de voz"}
        >
          {inputText.trim() ? (
            <Send className="w-4 h-4 -ml-0.5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </footer>
    </div>
  );
}
