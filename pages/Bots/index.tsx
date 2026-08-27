import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { formatCurrency } from "../../lib/currency";

export interface ProductItem {
  id: string;
  nome: string;
  descricao?: string;
  preco: number | string;
  renda_diaria: number | string;
  duracao_dias: number;
  limite_compra?: number;
  imagem_url?: string;
  storage_size?: string;
}

const GRADIENTS = [
  ["#3390ec", "#2f7ed6"],
  ["#e74c3c", "#c0392b"],
  ["#f59e0b", "#d97706"],
  ["#8b5cf6", "#7c3aed"],
  ["#10b981", "#059669"],
  ["#ec4899", "#be185d"],
];

function ProductCard({
  product,
  index,
  onBuy,
  buying,
}: {
  product: ProductItem;
  index: number;
  onBuy: (id: string) => void;
  buying: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isBuying = buying === product.id;
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const precoNum = Number(product.preco) || 0;
  const rendaNum = Number(product.renda_diaria) || 0;

  return (
    <div className="bg-white rounded-[20px] overflow-hidden border border-gray-100 shadow-xs">
      {/* Header do card */}
      <div
        className="flex items-center gap-4 px-4 py-4 cursor-pointer active:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Imagem / Ícone do Produto */}
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 shadow-sm overflow-hidden bg-gray-50 border border-gray-100"
          style={{
            background: !product.imagem_url
              ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`
              : undefined,
          }}
        >
          {product.imagem_url ? (
            <img
              src={product.imagem_url}
              alt={product.nome}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-white text-[16px] font-bold">
              {product.nome?.slice(0, 2).toUpperCase() || "TG"}
            </span>
          )}
        </div>

        {/* Nome + Descrição */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-gray-900 truncate">
              {product.nome}
            </span>
            {index === 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-[#3390ec]">
                Mais Popular
              </span>
            )}
          </div>
          <p className="text-[13px] text-gray-500 mt-0.5 truncate">
            {product.descricao || "Rendimento diário garantido"}
          </p>
        </div>

        {/* Preço + seta */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[14.5px] font-bold text-gray-900">
            {formatCurrency(precoNum, "KZ")}
          </span>
          <span className="text-[11px] text-gray-400">
            {product.duracao_dias} dias
          </span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </div>

      {/* Detalhe expandido */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <p className="text-[13.5px] text-gray-600 leading-relaxed mt-3 mb-4">
            {product.descricao || "Aumente suas estrelas e recompensas diárias com este bot oficial."}
          </p>

          {/* Stats */}
          <div className="flex flex-col gap-2 mb-4 bg-gray-50/70 p-3 rounded-[12px]">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-500">Recompensa diária:</span>
              <span className="font-bold text-[#25D366]">
                +{formatCurrency(rendaNum, "KZ")} / dia
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-500">Duração do contrato:</span>
              <span className="font-semibold text-gray-800">
                {product.duracao_dias} dias
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-500">Limite de ativação:</span>
              <span className="font-semibold text-gray-800">
                {product.limite_compra ? `${product.limite_compra} unidade(s)` : "Ilimitado"}
              </span>
            </div>
            {product.storage_size && (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gray-500">Capacidade:</span>
                <span className="font-semibold text-gray-800">
                  {product.storage_size}
                </span>
              </div>
            )}
          </div>

          {/* Botão comprar */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBuy(product.id);
            }}
            disabled={isBuying}
            className="w-full h-[46px] rounded-[14px] text-white font-semibold text-[15px] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            }}
          >
            {isBuying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              `Ativar Bot por ${formatCurrency(precoNum, "KZ")}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_available_products_mcpn");
        if (error) throw error;
        if (data && Array.isArray(data)) {
          setProducts(data as ProductItem[]);
        }
      } catch (err: any) {
        console.error("Erro ao carregar produtos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const handleBuy = useCallback(
    async (productId: string) => {
      setBuying(productId);
      try {
        const { data, error } = await supabase.rpc("buy_product_mcpn", {
          p_product_id: productId,
        });
        if (error) throw error;
        const result = data as { success: boolean; message: string };
        if (result?.success) {
          showToast(result.message, "success");
          navigate("/minhas-compras");
        } else {
          const raw = result?.message || "Falha na compra.";
          showToast(
            /saldo\s+insuficiente/i.test(raw)
              ? "Saldo insuficiente, recarregue primeiro."
              : raw,
            "error"
          );
        }
      } catch (err: any) {
        const raw = err.message || "Falha na transação.";
        showToast(
          /saldo\s+insuficiente/i.test(raw)
            ? "Saldo insuficiente, recarregue primeiro."
            : raw,
          "error"
        );
      } finally {
        setBuying(null);
      }
    },
    [navigate, showToast]
  );

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-16">
      {/* Header web */}
      <div className="w-full flex items-center px-6 pt-5 pb-3 sticky top-0 bg-[#f1f1f2] z-20">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 active:opacity-50 p-1 cursor-pointer"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <span className="text-[18px] font-bold flex-1">Bots Telegram</span>
        <span className="text-[13px] text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-2xs">
          {products.length} bots disponíveis
        </span>
      </div>

      {/* Subtítulo */}
      <div className="px-6 mb-5">
        <p className="text-[13.5px] text-gray-500 leading-relaxed">
          Escolha o bot ideal para automatizar suas recompensas e rendimentos em estrelas. Toque em qualquer item para ver detalhes e ativar.
        </p>
      </div>

      {/* Lista de bots do banco de dados */}
      <main className="w-full px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#25D366] animate-spin mb-2" />
            <p className="text-[13px] text-gray-400">Carregando bots disponíveis...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-[14px]">
            Nenhum bot disponível no momento.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onBuy={handleBuy}
                buying={buying}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
