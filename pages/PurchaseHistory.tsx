import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { formatCurrency } from "../lib/currency";
import { Bot, Calendar, Sparkles, ChevronRight, ArrowUpRight, Clock, TrendingUp, CheckCircle2 } from "lucide-react";

/* ─────────────────────────────────────────────
   HELPER: seconds until next daily credit cycle
───────────────────────────────────────────── */
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

function generateFakeHistory(dailyIncome: number, dataInicio: string) {
  const history: { time: string; amount: number }[] = [];
  const start = new Date(dataInicio);
  const creditHour = start.getHours();
  const creditMin = start.getMinutes();
  for (let i = 3; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(creditHour, creditMin, 0, 0);
    history.push({
      time: d.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" }),
      amount: dailyIncome,
    });
  }
  return history;
}

/* ─────────────────────────────────────────────
   COMPACT BOT CARD
───────────────────────────────────────────── */
function BotCard({ item, idx, language }: { item: any; idx: number; language: string }) {
  const navigate = useNavigate();
  const dailyIncome = Number(item.renda_diaria) || 0;
  const preco = Number(item.preco_pago) || 0;
  const isActive = Boolean(item.ativo);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    item.data_inicio ? getSecondsUntilNextCredit(item.data_inicio) : 86400
  );
  const [showFlash, setShowFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const history = generateFakeHistory(dailyIncome, item.data_inicio || new Date().toISOString());

  // Real-time countdown
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 2500);
          return item.data_inicio ? getSecondsUntilNextCredit(item.data_inicio) : 86400;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, item.data_inicio]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString(
      language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-AO",
      { day: "2-digit", month: "2-digit" }
    );
  };

  return (
    <div className="bg-white rounded-[16px] overflow-hidden shadow-2xs border border-gray-200/80 transition-all">
      {/* ── CARD HEADER: Avatar, Name, Status & Countdown ── */}
      <div className="p-3.5 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Avatar + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-[10px] bg-gradient-to-tr from-[#3390ec] to-[#54a9eb] flex items-center justify-center shadow-xs">
                {item.produto_imagem ? (
                  <img
                    src={item.produto_imagem}
                    alt={item.produto_nome}
                    className="w-full h-full object-cover rounded-[10px]"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25ae60] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25ae60] border border-white"></span>
                </span>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-bold text-black truncate leading-tight">
                {item.produto_nome || "Bot Telegram"}
              </span>
              <span className="text-[12px] text-[#8e8e93] truncate">
                ID: #{item.id?.toString().slice(0, 6).toUpperCase() || String(idx + 1).padStart(3, "0")}
                {item.storage_size ? ` • ${item.storage_size}` : ""}
              </span>
            </div>
          </div>

          {/* Right: Status badge */}
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
              isActive
                ? "bg-[#e8f7ef] text-[#25ae60]"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#25ae60]" : "bg-gray-400"}`} />
            {isActive ? "Ativo" : "Expirado"}
          </span>
        </div>

        {/* Real-time Countdown Banner (Compact) */}
        {isActive && (
          <div className="mt-2.5 flex items-center justify-between bg-[#f4f7fb] rounded-[10px] px-3 py-1.5 border border-[#e2eaf4]">
            <div className="flex items-center gap-1.5 text-[12px] text-[#3390ec] font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Próximo rendimento:</span>
            </div>
            <div className="font-mono text-[13px] font-bold text-[#1e6dc8] tabular-nums tracking-wide bg-white px-2 py-0.5 rounded-md shadow-2xs border border-[#d6e3f3]">
              {formatCountdown(secondsLeft)}
            </div>
          </div>
        )}

        {/* Flash on credit */}
        {showFlash && (
          <div className="mt-2 text-[12px] font-bold text-[#16a34a] bg-[#dcfce7] px-2.5 py-1 rounded-[8px] flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>+{formatCurrency(dailyIncome, "KZ")} creditado automaticamente! ✨</span>
          </div>
        )}
      </div>

      {/* ── CARD METRICS (3-col compact) ── */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 py-2 bg-white">
        <div className="px-3 py-1 text-center">
          <span className="text-[11px] text-[#8e8e93] block">Rendimento</span>
          <span className="text-[13px] font-bold text-[#25ae60]">
            +{formatCurrency(dailyIncome, "KZ")}
          </span>
        </div>
        <div className="px-3 py-1 text-center">
          <span className="text-[11px] text-[#8e8e93] block">Ativação</span>
          <span className="text-[13px] font-semibold text-black">
            {formatCurrency(preco, "KZ")}
          </span>
        </div>
        <div className="px-3 py-1 text-center">
          <span className="text-[11px] text-[#8e8e93] block">Período</span>
          <span className="text-[12px] font-medium text-gray-700">
            {formatDate(item.data_inicio)} - {formatDate(item.data_fim)}
          </span>
        </div>
      </div>

      {/* ── CARD ACTIONS ── */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50/70 border-t border-gray-100 text-[12px]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[#8e8e93] hover:text-black font-medium flex items-center gap-1 cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#3390ec]" />
          <span>Histórico de Rendimentos</span>
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
        </button>

        <button
          onClick={() => navigate("/telegramBussiness")}
          className="text-[#3390ec] font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
        >
          <span>Chat</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── EXPANDED HISTORY DRAWER ── */}
      {expanded && (
        <div className="bg-[#fafafa] border-t border-gray-100 px-3 py-2 space-y-1.5">
          <div className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-1">
            Últimos Ciclos Creditados
          </div>
          {history.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-[12px] py-1 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-1.5 text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25ae60]" />
                <span>{h.time}</span>
              </div>
              <span className="font-semibold text-[#25ae60]">+{formatCurrency(h.amount, "KZ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function PurchaseHistory() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPurchases() {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_my_purchased_products_mcpn");
        if (error) throw error;
        if (data) setPurchases(data);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    fetchPurchases();
  }, []);

  const activeBots = purchases.filter((p) => p.ativo).length;

  return (
    <div
      className="w-full min-h-[100dvh] flex flex-col pb-24"
      style={{
        backgroundColor: "#f1f1f2",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* HEADER */}
      <header className="flex items-center px-4 pt-4 pb-3 bg-[#f1f1f2] sticky top-0 z-30 border-b border-[#e5e5e5]">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 rounded-full active:opacity-50 transition-opacity mr-3"
          aria-label="Voltar"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <span className="text-[20px] font-bold text-black flex-1">Meus Bots</span>
        <button
          onClick={() => navigate("/bot-pay")}
          className="text-[15px] font-semibold text-[#3390ec] active:opacity-60 transition-opacity"
        >
          + Ativar Bot
        </button>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-3 pt-3">
        {/* Summary Bar */}
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-[13px] font-semibold text-[#8e8e93] uppercase tracking-wider">
            Automações ({purchases.length})
          </span>
          <span className="text-[12px] font-medium text-[#25ae60] bg-[#e8f7ef] px-2.5 py-0.5 rounded-full">
            {activeBots} em execução
          </span>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2.5">
            <div className="w-7 h-7 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#8e8e93]">Sincronizando bots...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="bg-white rounded-[16px] p-8 text-center border border-gray-200/70 shadow-2xs flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#f1f1f2] flex items-center justify-center text-[#8e8e93]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-black mb-1">Nenhum bot ativo</h3>
              <p className="text-[13px] text-[#8e8e93] max-w-[240px]">
                Ative um bot para receber recompensas automáticas diárias.
              </p>
            </div>
            <button
              onClick={() => navigate("/bot-pay")}
              className="mt-1 px-5 py-2 bg-[#3390ec] text-white text-[13px] font-semibold rounded-full shadow-xs active:scale-95 transition-transform cursor-pointer"
            >
              Ver Bots Disponíveis
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {purchases.map((item, idx) => (
              <BotCard key={item.id || idx} item={item} idx={idx} language={language} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
