import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";

/* ══════════════════════════════════════════════════════════════
   LISTA DE BOTS / PRODUTOS
══════════════════════════════════════════════════════════════ */
const BOTS = [
  {
    id: "botfather",
    emoji: "🤖",
    gradient: ["#3390ec", "#2f7ed6"],
    name: "@BotFather",
    tagline: "Criar e gerir bots",
    badge: "Mais Popular",
    badgeColor: "#3390ec",
    description: "O bot oficial do Telegram para criar e gerir todos os seus bots. Utilizado por milhões de developers mensalmente.",
    rendaDiaria: "US$ 2,50",
    duracao: "30 dias",
    limiteCompra: "5 unidades",
    price: "US$ 9,99",
    priceNote: "acesso vitalício",
  },
  {
    id: "spambot",
    emoji: "🛡️",
    gradient: ["#e74c3c", "#c0392b"],
    name: "@SpamBot",
    tagline: "Verificar limitações de spam",
    badge: "Segurança",
    badgeColor: "#e74c3c",
    description: "Verifica se a sua conta está com limitações de spam, recursos bloqueados ou restrições aplicadas pelo Telegram.",
    rendaDiaria: "US$ 1,20",
    duracao: "15 dias",
    limiteCompra: "10 unidades",
    price: "US$ 4,99",
    priceNote: "acesso vitalício",
  },
  {
    id: "premiumbot",
    emoji: "⭐",
    gradient: ["#f59e0b", "#d97706"],
    name: "@PremiumBot",
    tagline: "Serviços Telegram Premium",
    badge: "Premium",
    badgeColor: "#f59e0b",
    description: "Acesso a funcionalidades exclusivas do Telegram Premium: uploads maiores, stickers extra, sem anúncios e muito mais.",
    rendaDiaria: "US$ 8,99",
    duracao: "365 dias",
    limiteCompra: "2 unidades",
    price: "US$ 35,99",
    priceNote: "por ano",
  },
  {
    id: "skeddy",
    emoji: "⏰",
    gradient: ["#8b5cf6", "#7c3aed"],
    name: "@SkeddyBot",
    tagline: "Lembretes e tarefas",
    badge: "Produtividade",
    badgeColor: "#8b5cf6",
    description: "Crie lembretes, gerencie tarefas e organize os seus compromissos diretamente no Telegram com linguagem natural.",
    rendaDiaria: "US$ 3,80",
    duracao: "30 dias",
    limiteCompra: "8 unidades",
    price: "US$ 7,99",
    priceNote: "por mês",
  },
  {
    id: "combot",
    emoji: "📊",
    gradient: ["#10b981", "#059669"],
    name: "@Combot",
    tagline: "Gestão e estatísticas de grupos",
    badge: "Grupos",
    badgeColor: "#10b981",
    description: "A ferramenta mais completa para administrar grupos no Telegram: moderação, analytics, anti-spam e relatórios detalhados.",
    rendaDiaria: "US$ 5,50",
    duracao: "30 dias",
    limiteCompra: "5 unidades",
    price: "US$ 14,99",
    priceNote: "por mês",
  },
  {
    id: "aibot",
    emoji: "🤖",
    gradient: ["#ec4899", "#be185d"],
    name: "Bots de IA",
    tagline: "ChatGPT / IA no Telegram",
    badge: "IA",
    badgeColor: "#ec4899",
    description: "Vários bots que integram ChatGPT e outras IAs diretamente no Telegram. Converse, gere imagens e obtenha respostas inteligentes.",
    rendaDiaria: "US$ 7,20",
    duracao: "30 dias",
    limiteCompra: "3 unidades",
    price: "US$ 19,99",
    priceNote: "por mês",
  },
];

/* ══════════════════════════════════════════════════════════════
   CARD DE BOT
══════════════════════════════════════════════════════════════ */
function BotCard({ bot, onBuy, buying }: { bot: typeof BOTS[0]; onBuy: (id: string) => void; buying: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const isBuying = buying === bot.id;

  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-gray-100">
      {/* Header do card */}
      <div
        className="flex items-center gap-4 px-4 py-4 cursor-pointer active:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Ícone com gradiente */}
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 text-[24px] shadow-sm"
          style={{ background: `linear-gradient(135deg, ${bot.gradient[0]}, ${bot.gradient[1]})` }}
        >
          {bot.emoji}
        </div>

        {/* Nome + tagline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-gray-900">{bot.name}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: bot.badgeColor }}
            >
              {bot.badge}
            </span>
          </div>
          <p className="text-[13px] text-gray-500 mt-0.5 truncate">{bot.tagline}</p>
        </div>

        {/* Preço + seta */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[15px] font-bold text-gray-900">{bot.price}</span>
          <span className="text-[11px] text-gray-400">{bot.priceNote}</span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </div>

      {/* Detalhe expandido */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <p className="text-[13.5px] text-gray-600 leading-relaxed mt-3 mb-4">{bot.description}</p>

          {/* Stats como lista com bolinhas */}
          <div className="flex flex-col gap-1.5 mb-4">
            {[
              { label: "Renda diária", value: bot.rendaDiaria },
              { label: "Duração", value: bot.duracao },
              { label: "Limite de compra", value: bot.limiteCompra },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: bot.gradient[0] }}
                />
                <span className="text-[13px] text-gray-700">
                  <span className="font-semibold">{item.label}:</span> {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Botão comprar */}
          <button
            onClick={(e) => { e.stopPropagation(); onBuy(bot.id); }}
            disabled={isBuying}
            className="w-full h-[46px] rounded-[14px] text-white font-semibold text-[15px] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${bot.gradient[0]}, ${bot.gradient[1]})` }}
          >
            {isBuying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              `Adquirir por ${bot.price}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function Products() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = useCallback(async (productId: string) => {
    setBuying(productId);
    try {
      const { data, error } = await supabase.rpc("buy_product_mcpn", { p_product_id: productId });
      if (error) throw error;
      const result = data as { success: boolean; message: string };
      if (result?.success) {
        showToast(result.message, "success");
        navigate("/minhas-compras");
      } else {
        const raw = result?.message || "Falhou";
        showToast(/saldo\s+insuficiente/i.test(raw) ? "Saldo insuficiente, recarregue primeiro" : raw, "error");
      }
    } catch (err: any) {
      const raw = err.message || "Falha";
      showToast(/saldo\s+insuficiente/i.test(raw) ? "Saldo insuficiente, recarregue primeiro" : raw, "error");
    } finally {
      setBuying(null);
    }
  }, [navigate, showToast]);

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-16">

      {/* Header web */}
      <div className="w-full flex items-center px-6 pt-5 pb-3 sticky top-0 bg-[#f1f1f2] z-20">
        <button onClick={() => navigate(-1)} className="mr-4 active:opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <span className="text-[18px] font-bold flex-1">Telegram Bots</span>
        <span className="text-[13px] text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200">
          {BOTS.length} produtos
        </span>
      </div>

      {/* Subtítulo */}
      <div className="px-6 mb-5">
        <p className="text-[13.5px] text-gray-500 leading-relaxed">
          Escolha o bot ideal para o seu negócio ou necessidade. Toque num produto para ver detalhes e adquirir.
        </p>
      </div>

      {/* Lista de bots - um abaixo do outro */}
      <main className="w-full px-6">
        <div className="flex flex-col gap-3">
          {BOTS.map((bot) => (
            <BotCard key={bot.id} bot={bot} onBuy={handleBuy} buying={buying} />
          ))}
        </div>
      </main>
    </div>
  );
}
