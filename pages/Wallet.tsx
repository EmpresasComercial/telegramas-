import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/currency";
import { 
  ArrowLeft, 
  MoreHorizontal, 
  Eye, 
  EyeOff, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Star, 
  Clock,
  ShieldCheck,
  ChevronRight,
  Send,
  Sparkles
} from "lucide-react";

interface Transaction {
  id: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  description?: string;
}

function statusLabel(s: string) {
  if (s === "pending") return { text: "Pendente", color: "#f2a93b" };
  if (s === "approved") return { text: "Concluído", color: "#34c759" };
  if (s === "rejected") return { text: "Recusado", color: "#ff3b30" };
  return { text: s, color: "#8e8e93" };
}

function groupByDate(txs: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const tx of txs) {
    const d = new Date(tx.created_at).toDateString();
    const label = d === today ? "Hoje" : d === yesterday ? "Ontem" : new Date(tx.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  }
  return Object.entries(groups);
}

// Official TON Logo
function TonLogo() {
  return (
    <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center shadow-xs">
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L3 8.5H7.5L12 16.5L16.5 8.5H21L12 2ZM12 5.5L15 10H9L12 5.5Z"/>
      </svg>
    </div>
  );
}

// USDT Tether Logo
function UsdtLogo() {
  return (
    <div className="w-10 h-10 rounded-full bg-[#26a17b] flex items-center justify-center shadow-xs">
      <span className="text-white font-bold text-base leading-none">₮</span>
    </div>
  );
}

// Telegram Stars Logo
function StarsLogo() {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f59e0b] to-[#fbbf24] flex items-center justify-center shadow-xs">
      <Star className="w-5 h-5 text-white fill-white" />
    </div>
  );
}

// Kwanza Angolano (KZ) Logo
function KzLogo() {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#3390ec] to-[#54a9eb] flex items-center justify-center shadow-xs">
      <span className="text-white font-bold text-xs tracking-tight">Kz</span>
    </div>
  );
}

export default function Wallet() {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState(0);
  const [dailyIncome, setDailyIncome] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const USDT_RATE = 1100;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Account Stats
      const { data: accData } = await supabase.rpc("get_my_account_data");
      if (accData && accData.length > 0) {
        const d = accData[0] as any;
        if (d.saldo_disponivel !== undefined) setBalance(Number(d.saldo_disponivel));
        else if (d.balance !== undefined) setBalance(Number(d.balance));
        
        if (d.lucro_acumulado !== undefined) setDailyIncome(Number(d.lucro_acumulado));
        else if (d.daily_earnings !== undefined) setDailyIncome(Number(d.daily_earnings));

        if (d.total_recarregado !== undefined) setTotalDeposits(Number(d.total_recarregado));
        if (d.total_retirado !== undefined) setTotalWithdrawals(Number(d.total_retirado));
      }

      // 2. Deposits
      const { data: deposits } = await supabase
        .from("recargas_mcpn")
        .select("id, valor, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      // 3. Withdrawals
      const { data: withdrawals } = await supabase
        .rpc("get_my_withdrawals_mcpn");

      const allTx: Transaction[] = [
        ...(deposits || []).map((d: any) => ({
          id: `dep-${d.id}`,
          type: "deposit" as const,
          amount: Number(d.valor),
          status: (d.status || "pending") as any,
          created_at: d.created_at,
          description: "Recarga de Saldo",
        })),
        ...(withdrawals || []).slice(0, 20).map((w: any) => ({
          id: `wit-${w.id}`,
          type: "withdraw" as const,
          amount: Number(w.valor),
          status: (w.status || "pending") as any,
          created_at: w.created_at,
          description: "Levantamento de Saldo",
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTx);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const balanceUSDT = balance / USDT_RATE;
  const grouped = groupByDate(transactions);

  return (
    <div className="w-full min-h-[100dvh] bg-[#f2f2f7] text-[#000000] font-sans antialiased pb-28">
      {/* ── HEADER (iOS Nav Bar) ── */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-[#00000015] px-4 h-[50px] flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[#007aff] active:opacity-40 transition-opacity"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[17px] font-normal leading-none">Voltar</span>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-[17px] font-semibold tracking-tight text-black flex items-center gap-1.5">
            Carteira
            <ShieldCheck className="w-4 h-4 text-[#34c759]" />
          </h1>
          <span className="text-[11px] text-[#8e8e93] font-medium leading-none">TON Space & Finanças</span>
        </div>
        <button 
          onClick={() => navigate("/informacao-bancaria")}
          className="p-1 text-[#007aff] active:opacity-40 transition-opacity" 
          aria-label="Opções"
        >
          <MoreHorizontal className="w-6 h-6 stroke-[2]" />
        </button>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 flex flex-col gap-4">
        {/* ── HERO BALANCE CARD (Telegram Dark Gradient) ── */}
        <div 
          className="w-full rounded-[24px] p-5 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #182533 0%, #0f1822 55%, #1c2c3e 100%)",
          }}
        >
          {/* Subtle Glow Circle */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#3390ec]/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar inside Card */}
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#ffd60a]" />
              </div>
              <span className="text-white/70 text-[13px] font-medium tracking-wide">Saldo Total da Conta</span>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 rounded-full bg-white/10 active:bg-white/20 transition-colors text-white/80"
              title={showBalance ? "Ocultar Saldo" : "Mostrar Saldo"}
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Large Main Balance */}
          <div className="relative z-10 mb-1">
            <h2 className="text-[34px] font-bold tracking-tight leading-none text-white">
              {showBalance ? formatCurrency(balance, "KZ") : "•••••••• Kz"}
            </h2>
          </div>
          <p className="text-white/60 text-[13px] font-medium mb-5 relative z-10">
            {showBalance ? `≈ $${balanceUSDT.toFixed(2)} USDT` : "≈ •••• USDT"}
          </p>

          {/* Small Sub-Metrics (Renda Diária & Depósitos) */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 relative z-10">
            <div>
              <span className="text-white/50 text-[11px] block font-medium">Renda Diária</span>
              <span className="text-[#34c759] text-[13px] font-bold truncate block">
                {showBalance ? `+${formatCurrency(dailyIncome, "KZ")}` : "••••"}
              </span>
            </div>
            <div>
              <span className="text-white/50 text-[11px] block font-medium">Recarregado</span>
              <span className="text-white text-[13px] font-semibold truncate block">
                {showBalance ? formatCurrency(totalDeposits, "KZ") : "••••"}
              </span>
            </div>
            <div>
              <span className="text-white/50 text-[11px] block font-medium">Retirado</span>
              <span className="text-white text-[13px] font-semibold truncate block">
                {showBalance ? formatCurrency(totalWithdrawals, "KZ") : "••••"}
              </span>
            </div>
          </div>
        </div>

        {/* ── QUICK ACTIONS (iOS Telegram Style) ── */}
        <div className="grid grid-cols-4 gap-2.5 w-full">
          <button
            onClick={() => navigate("/recarregar")}
            className="bg-white rounded-[20px] py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.96] transition-transform cursor-pointer border border-[#00000008]"
          >
            <div className="w-[44px] h-[44px] rounded-full bg-[#007aff]/10 flex items-center justify-center text-[#007aff]">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[12px] font-semibold text-[#1c1c1e] text-center leading-tight">Recarregar</span>
          </button>

          <button
            onClick={() => navigate("/retirada")}
            className="bg-white rounded-[20px] py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.96] transition-transform cursor-pointer border border-[#00000008]"
          >
            <div className="w-[44px] h-[44px] rounded-full bg-[#ff3b30]/10 flex items-center justify-center text-[#ff3b30]">
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[12px] font-semibold text-[#1c1c1e] text-center leading-tight">Retirar</span>
          </button>

          <button
            onClick={() => navigate("/telegramBussiness")}
            className="bg-white rounded-[20px] py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.96] transition-transform cursor-pointer border border-[#00000008]"
          >
            <div className="w-[44px] h-[44px] rounded-full bg-[#34c759]/10 flex items-center justify-center text-[#34c759]">
              <Send className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[12px] font-semibold text-[#1c1c1e] text-center leading-tight">Transferir</span>
          </button>

          <button
            onClick={() => navigate("/stars")}
            className="bg-white rounded-[20px] py-3.5 px-2 flex flex-col items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.96] transition-transform cursor-pointer border border-[#00000008]"
          >
            <div className="w-[44px] h-[44px] rounded-full bg-[#ff9500]/10 flex items-center justify-center text-[#ff9500]">
              <Star className="w-6 h-6 fill-current stroke-[1]" />
            </div>
            <span className="text-[12px] font-semibold text-[#1c1c1e] text-center leading-tight">Estrelas</span>
          </button>
        </div>

        {/* ── ASSETS LIST (iOS Card) ── */}
        <section className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[#8e8e93] uppercase tracking-wide px-2">
            Meus Ativos & Moedas
          </span>
          <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#00000008]">
            {/* Kwanza */}
            <div 
              onClick={() => navigate("/recarregar")}
              className="flex items-center px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer border-b border-[#0000000d]"
            >
              <KzLogo />
              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-black">Kwanza Angolano</span>
                  <span className="text-[16px] font-semibold text-black">
                    {showBalance ? formatCurrency(balance, "KZ") : "••••"}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[13px] text-[#8e8e93]">Saldo Operacional Local</span>
                  <span className="text-[13px] text-[#34c759] font-medium">Ativo</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#c7c7cc] ml-2 shrink-0" />
            </div>

            {/* USDT Tether */}
            <div 
              onClick={() => navigate("/recarregar")}
              className="flex items-center px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer border-b border-[#0000000d]"
            >
              <UsdtLogo />
              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-black">USDT</span>
                  <span className="text-[16px] font-semibold text-black">
                    {showBalance ? `${balanceUSDT.toFixed(2)} USDT` : "••••"}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[13px] text-[#8e8e93]">Tether USD (TRC20 / TON)</span>
                  <span className="text-[13px] text-[#8e8e93]">1 USDT ≈ 1.100 Kz</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#c7c7cc] ml-2 shrink-0" />
            </div>

            {/* TON Space */}
            <div 
              onClick={() => navigate("/sobre-telegram business")}
              className="flex items-center px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer border-b border-[#0000000d]"
            >
              <TonLogo />
              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-black">TON Space</span>
                  <span className="text-[16px] font-semibold text-black">0.00 TON</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[13px] text-[#8e8e93]">The Open Network</span>
                  <span className="text-[13px] text-[#007aff] font-medium">Conectado</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#c7c7cc] ml-2 shrink-0" />
            </div>

            {/* Telegram Stars */}
            <div 
              onClick={() => navigate("/stars")}
              className="flex items-center px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            >
              <StarsLogo />
              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-black">Telegram Stars</span>
                  <span className="text-[16px] font-semibold text-black">0 ⭐</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[13px] text-[#8e8e93]">Bens Digitais & Bots</span>
                  <span className="text-[13px] text-[#ff9500] font-medium">Ver pacotes</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#c7c7cc] ml-2 shrink-0" />
            </div>
          </div>
        </section>

        {/* ── TRANSACTIONS HISTORY (iOS List grouped by Date) ── */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[13px] font-semibold text-[#8e8e93] uppercase tracking-wide">
              Histórico de Atividades
            </span>
            <button 
              onClick={() => fetchData()}
              className="text-[13px] font-medium text-[#007aff] active:opacity-50"
            >
              Atualizar
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-[20px] py-12 flex flex-col items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#00000008]">
              <div className="w-6 h-6 border-2 border-[#007aff] border-t-transparent rounded-full animate-spin" />
              <span className="text-[13px] text-[#8e8e93]">Carregando transações...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-white rounded-[20px] py-12 px-4 flex flex-col items-center justify-center gap-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#00000008] text-center">
              <div className="w-12 h-12 rounded-full bg-[#f2f2f7] flex items-center justify-center text-[#8e8e93]">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-[15px] font-semibold text-black mt-1">Nenhuma movimentação</p>
              <p className="text-[13px] text-[#8e8e93] max-w-[240px]">
                As suas recargas e retiradas aprovadas ou pendentes serão listadas aqui.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {grouped.map(([dateLabel, txList]) => (
                <div key={dateLabel} className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider px-2">
                    {dateLabel}
                  </span>
                  <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#00000008]">
                    {txList.map((tx, idx) => {
                      const isDeposit = tx.type === "deposit";
                      const st = statusLabel(tx.status);
                      const timeStr = new Date(tx.created_at).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={tx.id}
                          className={`flex items-center px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                            idx < txList.length - 1 ? "border-b border-[#0000000d]" : ""
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-3.5 ${
                              isDeposit ? "bg-[#34c759]/10 text-[#34c759]" : "bg-[#ff3b30]/10 text-[#ff3b30]"
                            }`}
                          >
                            {isDeposit ? (
                              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[15px] font-semibold text-black truncate">
                                {tx.description}
                              </span>
                              <span
                                className={`text-[15px] font-bold ${
                                  isDeposit ? "text-[#34c759]" : "text-[#ff3b30]"
                                }`}
                              >
                                {isDeposit ? "+" : "-"}
                                {formatCurrency(tx.amount, "KZ")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[12.5px] font-medium" style={{ color: st.color }}>
                                {st.text}
                              </span>
                              <span className="text-[12px] text-[#8e8e93]">{timeStr}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
