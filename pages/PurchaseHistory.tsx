import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { formatCurrency } from "../lib/currency";
import { Bot, Calendar, Sparkles, ChevronRight, ArrowUpRight, Activity, Clock, TrendingUp, CheckCircle2 } from "lucide-react";

/* ─────────────────────────────────────────────
   HELPER: seconds until next daily credit cycle
   The credit fires every 24h at the same time
   as data_inicio (HH:MM:SS of first activation)
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
    return 86400; // fallback 24h
  }
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/* ─────────────────────────────────────────────
   SIMULATED INCOME HISTORY (3 past cycles)
   Will be replaced by real backend data later
───────────────────────────────────────────── */
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
   BOT CARD with real-time countdown
───────────────────────────────────────────── */
function BotCard({ item, idx, language }: { item: any; idx: number; language: string }) {
  const navigate = useNavigate();
  const dailyIncome = Number(item.renda_diaria) || 0;
  const preco = Number(item.preco_pago) || 0;
  const isActive = Boolean(item.ativo);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    item.data_inicio ? getSecondsUntilNextCredit(item.data_inicio) : 86400
  );
  const [cycleCount, setCycleCount] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const history = generateFakeHistory(dailyIncome, item.data_inicio || new Date().toISOString());

  // Real-time countdown
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Cycle complete — simulate credit & restart
          setCycleCount((c) => c + 1);
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 2000);
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
      { day: "2-digit", month: "2-digit", year: "numeric" }
    );
  };

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "#fff",
        borderRadius: 20,
        border: "1px solid #e5e5e5",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      {/* ── TOP HEADER: status + ID ── */}
      <div
        style={{
          background: isActive
            ? "linear-gradient(135deg, #1a6ed8 0%, #3390ec 50%, #54a9eb 100%)"
            : "#8e8e93",
          padding: "16px 16px 14px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated background pulse (active only) */}
        {isActive && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)",
                animation: "bgPulse 3s ease-in-out infinite",
              }}
            />
            {/* Flowing data lines */}
            <div
              style={{
                position: "absolute",
                top: 8,
                right: -10,
                width: 120,
                height: 120,
                border: "1.5px solid rgba(255,255,255,0.12)",
                borderRadius: "50%",
                animation: "ringExpand 4s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 20,
                right: 5,
                width: 80,
                height: 80,
                border: "1.5px solid rgba(255,255,255,0.10)",
                borderRadius: "50%",
                animation: "ringExpand 4s ease-in-out infinite 1.5s",
              }}
            />
          </>
        )}

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Pulsing active dot */}
              {isActive ? (
                <div style={{ position: "relative", width: 10, height: 10 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#4ade80",
                      position: "absolute",
                    }}
                  />
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "rgba(74,222,128,0.4)",
                      position: "absolute",
                      animation: "dotPulse 1.5s ease-out infinite",
                    }}
                  />
                </div>
              ) : (
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#d1d5db" }} />
              )}
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {isActive ? "Em Funcionamento" : "Inativo"}
              </span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              #{item.id?.toString().slice(0, 8).toUpperCase() || String(idx + 1).padStart(4, "0")}
            </span>
          </div>

          {/* Bot name */}
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4, lineHeight: 1.2 }}>
            {item.produto_nome || "Bot Telegram"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            {item.storage_size ? `Capacidade: ${item.storage_size}` : "Automação Oficial do Telegram"}
          </div>
        </div>
      </div>

      {/* ── FLASH on cycle complete ── */}
      {showFlash && (
        <div
          style={{
            background: "linear-gradient(90deg, #dcfce7, #bbf7d0)",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "slideIn 0.3s ease",
          }}
        >
          <CheckCircle2 size={16} color="#16a34a" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>
            +{formatCurrency(dailyIncome, "KZ")} creditado automaticamente! ✨
          </span>
        </div>
      )}

      {/* ── COUNTDOWN TIMER ── */}
      {isActive && (
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafafa",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Clock size={13} color="#8e8e93" />
            <span style={{ fontSize: 12, color: "#8e8e93", fontWeight: 500 }}>Próximo rendimento em</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {formatCountdown(secondsLeft).split(":").map((unit, i, arr) => (
              <React.Fragment key={i}>
                <div
                  style={{
                    background: "#1a1a2e",
                    borderRadius: 10,
                    padding: "10px 14px",
                    minWidth: 54,
                    textAlign: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {unit}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 3, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {i === 0 ? "Horas" : i === 1 ? "Min" : "Seg"}
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#3390ec", lineHeight: 1, alignSelf: "flex-start", marginTop: 10 }}>:</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ── INFO ROWS ── */}
      <div>
        {/* Recompensa Diária */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={15} color="#16a34a" />
            </div>
            <span style={{ fontSize: 15, color: "#1a1a1a" }}>Recompensa por Ciclo</span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#16a34a" }}>+{formatCurrency(dailyIncome, "KZ")}</span>
        </div>

        {/* Valor de Ativação */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#fef9ec", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUpRight size={15} color="#d97706" />
            </div>
            <span style={{ fontSize: 15, color: "#1a1a1a" }}>Valor de Ativação</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>{formatCurrency(preco, "KZ")}</span>
        </div>

        {/* Período */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={15} color="#3390ec" />
            </div>
            <span style={{ fontSize: 15, color: "#1a1a1a" }}>Período Ativo</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#8e8e93" }}>
            {formatDate(item.data_inicio)} – {formatDate(item.data_fim)}
          </span>
        </div>

        {/* Ciclos completos */}
        {isActive && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={15} color="#7c3aed" />
              </div>
              <span style={{ fontSize: 15, color: "#1a1a1a" }}>Ciclos nesta sessão</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#7c3aed" }}>{cycleCount}</span>
          </div>
        )}

        {/* HISTÓRICO COMPACTADO */}
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: expanded ? "1px solid #f0f0f0" : "none" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={15} color="#0ea5e9" />
            </div>
            <span style={{ fontSize: 15, color: "#1a1a1a" }}>Histórico de Rendimentos</span>
          </div>
          <ChevronRight
            size={16}
            color="#c7c7cc"
            style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
          />
        </button>

        {expanded && (
          <div style={{ background: "#fafafa", padding: "8px 0" }}>
            {history.map((h, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ fontSize: 13, color: "#8e8e93" }}>{h.time}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>+{formatCurrency(h.amount, "KZ")}</span>
              </div>
            ))}
            <div style={{ padding: "6px 16px" }}>
              <span style={{ fontSize: 11, color: "#c7c7cc" }}>* Histórico simulado — dados reais serão integrados via backend</span>
            </div>
          </div>
        )}

        {/* Abrir no chat */}
        <button
          onClick={() => navigate("/telegramBussiness")}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "none", border: "none", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={15} color="#3390ec" />
            </div>
            <span style={{ fontSize: 15, color: "#3390ec", fontWeight: 500 }}>Abrir Bot no Chat</span>
          </div>
          <ChevronRight size={16} color="#c7c7cc" />
        </button>
      </div>
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
    <>
      {/* ── CSS Keyframes injetados globalmente ── */}
      <style>{`
        @keyframes dotPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes bgPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes ringExpand {
          0% { transform: scale(0.8); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.15; }
          100% { transform: scale(0.8); opacity: 0.4; }
        }
        @keyframes slideIn {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          paddingBottom: 80,
          backgroundColor: "#f1f1f2",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 16px 12px",
            backgroundColor: "#f1f1f2",
            position: "sticky",
            top: 0,
            zIndex: 30,
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{ padding: 4, marginLeft: -4, marginRight: 12, background: "none", border: "none", cursor: "pointer" }}
            aria-label="Voltar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
          </button>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#000", flex: 1 }}>Meus Bots</span>
          <button
            onClick={() => navigate("/bot-pay")}
            style={{ fontSize: 16, fontWeight: 500, color: "#3390ec", background: "none", border: "none", cursor: "pointer" }}
          >
            + Ativar Bot
          </button>
        </header>

        {/* CONTEÚDO */}
        <main style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "0 12px" }}>

          {/* HERO */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 16px" }}>
            {/* Animated bot icon */}
            <div style={{ position: "relative", width: 80, height: 80, marginBottom: 10 }}>
              {activeBots > 0 && (
                <>
                  <div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "2px solid rgba(51,144,236,0.25)", animation: "ringExpand 3s ease-in-out infinite" }} />
                  <div style={{ position: "absolute", inset: -14, borderRadius: "50%", border: "2px solid rgba(51,144,236,0.12)", animation: "ringExpand 3s ease-in-out infinite 1s" }} />
                </>
              )}
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: activeBots > 0
                    ? "linear-gradient(135deg, #1a6ed8, #54a9eb)"
                    : "#8e8e93",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: activeBots > 0 ? "0 4px 20px rgba(51,144,236,0.35)" : "none",
                }}
              >
                <Bot size={36} color="#fff" />
              </div>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#000", margin: "0 0 4px" }}>Automações Ativas</h2>
            <p style={{ fontSize: 13, color: "#8e8e93", margin: 0 }}>
              {activeBots} de {purchases.length} bots em execução no Telegram
            </p>
          </div>

          {/* ESTADOS */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #3390ec", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
              <p style={{ fontSize: 13, color: "#8e8e93" }}>Sincronizando bots ativos...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : purchases.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: 32,
                textAlign: "center",
                border: "1px solid #e5e5e5",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f1f1f2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bot size={28} color="#8e8e93" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#000", margin: "0 0 6px" }}>Nenhum bot ativo</h3>
                <p style={{ fontSize: 13, color: "#8e8e93", margin: 0, maxWidth: 260 }}>
                  Ative um bot de automação para começar a receber recompensas diárias em estrelas.
                </p>
              </div>
              <button
                onClick={() => navigate("/bot-pay")}
                style={{
                  marginTop: 8,
                  padding: "10px 28px",
                  background: "#3390ec",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 50,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(51,144,236,0.3)",
                }}
              >
                Ver Bots Disponíveis
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
              {purchases.map((item, idx) => (
                <BotCard key={item.id || idx} item={item} idx={idx} language={language} />
              ))}
            </div>
          )}

        </main>
      </div>
    </>
  );
}
