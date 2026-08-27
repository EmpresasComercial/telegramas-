import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { formatCurrency } from "../lib/currency";
import { Bot, Calendar, Sparkles, ChevronRight, ArrowUpRight } from "lucide-react";

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString(
      language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-AO",
      { day: "2-digit", month: "2-digit", year: "numeric" }
    );
  };

  const activeBots = purchases.filter((p) => p.ativo).length;

  return (
    <div
      className="w-full min-h-[100dvh] flex flex-col pb-20"
      style={{
        backgroundColor: "#f1f1f2",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* ──────── HEADER (Estilo Editar Perfil) ──────── */}
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
          className="text-[16px] font-medium text-[#3390ec] active:opacity-60 transition-opacity flex items-center gap-1"
        >
          + Ativar Bot
        </button>
      </header>

      {/* ──────── CONTEÚDO ──────── */}
      <main className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
        {/* ── TOP HERO BADGE ── */}
        <div className="flex flex-col items-center py-5">
          <div className="w-[84px] h-[84px] rounded-full bg-gradient-to-tr from-[#3390ec] to-[#54a9eb] flex items-center justify-center shadow-md">
            <Bot className="w-10 h-10 text-white" strokeWidth={1.8} />
          </div>
          <h2 className="text-[20px] font-bold text-black mt-2.5 mb-0.5">Automações Ativas</h2>
          <p className="text-[13px] text-[#8e8e93]">
            {activeBots} de {purchases.length} bots em execução no Telegram
          </p>
        </div>

        {/* ── LISTA DE CARDS ESTILO EDITAR PERFIL ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-7 h-7 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#8e8e93]">Sincronizando bots ativos...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="px-4">
            <div className="bg-white rounded-[16px] p-8 text-center shadow-2xs border border-gray-100 flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-[#f1f1f2] rounded-full flex items-center justify-center text-[#8e8e93]">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-black mb-1">Nenhum bot ativo</h3>
                <p className="text-[13px] text-[#8e8e93] max-w-[260px]">
                  Ative um bot de automação para começar a receber recompensas diárias em estrelas.
                </p>
              </div>
              <button
                onClick={() => navigate("/bot-pay")}
                className="mt-2 px-6 py-2.5 bg-[#3390ec] text-white text-[14px] font-semibold rounded-full shadow-xs active:scale-95 transition-transform cursor-pointer"
              >
                Ver Bots Disponíveis
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-0 sm:px-4">
            {purchases.map((item, idx) => {
              const dailyIncome = Number(item.renda_diaria) || 0;
              const preco = Number(item.preco_pago) || 0;
              const isActive = Boolean(item.ativo);

              return (
                <div key={item.id || idx} className="bg-white shadow-2xs border-y sm:border sm:rounded-[18px] border-[#e5e5e5] overflow-hidden">
                  {/* Seção Superior: Título do Bot */}
                  <div className="px-4 pt-3.5 pb-2 flex items-center justify-between border-b border-[#e5e5e5]">
                    <span className="text-[13px] font-semibold text-[#4faf64] uppercase tracking-wider">
                      Bot #{item.id?.toString().slice(0, 8).toUpperCase() || idx + 1}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isActive
                          ? "bg-[#e8f7ef] text-[#25ae60]"
                          : "bg-[#fff0f0] text-[#fe384f]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-[#25ae60]" : "bg-[#fe384f]"}`} />
                      {isActive ? "Em Operação" : "Expirado"}
                    </span>
                  </div>

                  {/* Nome do Bot & Avatar */}
                  <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
                    <div className="w-[42px] h-[42px] rounded-full bg-gradient-to-tr from-[#3390ec] to-[#54a9eb] flex items-center justify-center mr-3.5 shrink-0 overflow-hidden shadow-xs">
                      {item.produto_imagem ? (
                        <img
                          src={item.produto_imagem}
                          alt={item.produto_nome}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Bot className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[17px] text-black font-semibold truncate leading-tight">
                        {item.produto_nome || "Bot Telegram"}
                      </span>
                      <span className="text-[13px] text-[#8e8e93] truncate mt-0.5">
                        {item.storage_size ? `Capacidade: ${item.storage_size}` : "Automação Oficial"}
                      </span>
                    </div>
                  </div>

                  {/* Recompensa Diária */}
                  <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
                    <div className="w-[34px] h-[34px] rounded-full bg-[#4faf64] flex items-center justify-center mr-4 shrink-0">
                      <Sparkles className="w-[17px] h-[17px] text-white" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[17px] text-[#25ae60] font-bold">
                        +{formatCurrency(dailyIncome, "KZ")}
                      </span>
                      <span className="text-[13px] text-[#8e8e93]">Recompensa Diária em Estrelas</span>
                    </div>
                  </div>

                  {/* Custo de Ativação */}
                  <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
                    <div className="w-[34px] h-[34px] rounded-full bg-[#f2a93b] flex items-center justify-center mr-4 shrink-0">
                      <ArrowUpRight className="w-[17px] h-[17px] text-white stroke-[2.5]" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[17px] text-black font-normal">
                        {formatCurrency(preco, "KZ")}
                      </span>
                      <span className="text-[13px] text-[#8e8e93]">Valor de Ativação</span>
                    </div>
                  </div>

                  {/* Período de Ativação */}
                  <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
                    <div className="w-[34px] h-[34px] rounded-full bg-[#3390ec] flex items-center justify-center mr-4 shrink-0">
                      <Calendar className="w-[17px] h-[17px] text-white stroke-[2]" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[15px] text-black font-normal">
                        {formatDate(item.data_inicio)} — {formatDate(item.data_fim)}
                      </span>
                      <span className="text-[13px] text-[#8e8e93]">Período de Execução do Bot</span>
                    </div>
                  </div>

                  {/* Ação: Acessar / Suporte do Bot */}
                  <div className="px-4 py-3 flex items-center justify-between bg-gray-50/50">
                    <span className="text-[13px] text-[#8e8e93]">Status do Algoritmo</span>
                    <button
                      onClick={() => navigate("/telegramBussiness")}
                      className="text-[15px] text-[#3390ec] font-semibold flex items-center gap-1 active:opacity-60 transition-opacity cursor-pointer"
                    >
                      Abrir no Chat
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-10" />
      </main>
    </div>
  );
}
