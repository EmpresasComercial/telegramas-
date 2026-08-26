import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../lib/currency';
import { SmartImage } from '../../../components/SmartImage';
import { ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const ServiceHighlights: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const { data, error } = await supabase.rpc('get_available_products_mcpn');
        if (error) throw error;
        
        if (data) {
          setProducts(data.slice(0, 4));
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  return (
    <div className="space-y-6 px-1">
      <div className="flex flex-col gap-1">
        <h2 className="text-[20px] font-medium text-[#333333] tracking-tight">{t('home.services_section_title')}</h2>
        <p className="text-[13px] text-gray-400 font-light">{t('home.services_section_sub')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ms-blue"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/bot-pay/${product.id}`)}
              className="bg-white rounded-[16px] p-3.5 flex items-center gap-4 border border-[#F5F5F5] cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                {product.imagem_url ? (
                  <SmartImage 
                    src={product.imagem_url} 
                    alt={product.nome} 
                    className="w-full h-full object-contain !bg-transparent"
                    style={{ background: 'transparent' }}
                  />
                ) : (
                  <ShieldCheck size={24} className="text-gray-400" strokeWidth={1.5} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-[#333333] truncate mb-0.5">{product.nome}</h3>
                
                <div className="flex items-center gap-2 text-[11px] font-light text-gray-500 mb-1.5">
                  <span className="text-[#C62828] font-normal">+{Number(product.renda_diaria).toLocaleString('pt-BR')} Kz/{t('product.unit.day')}</span>
                  <span>•</span>
                  <span>{product.duracao_dias} {product.duracao_dias === 1 ? t('product.unit.day') : t('product.unit.days')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold bg-gradient-to-r from-[#C62828] to-[#1A237E] bg-clip-text text-transparent">
                    {formatCurrency(product.preco, 'KZ')}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/bot-pay/${product.id}`);
                    }}
                    className="h-6 px-4 rounded-full bg-gradient-to-r from-[#C62828] to-[#1A237E] text-white text-[10px] font-medium transition-opacity hover:opacity-90"
                  >
                    {t('products.btn_buy')}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
