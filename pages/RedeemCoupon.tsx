import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Loader2, Tag } from 'lucide-react';

export default function RedeemCoupon() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coupon, setCoupon] = useState('');

  const handleCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCoupon(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupon || coupon.length < 5) {
      showToast('Código de cupom inválido.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('redeem_coupon_mcpn', { p_code: coupon });
      if (error) throw error;
      const result = data as { success: boolean; message: string } | null;
      if (result && result.success) {
        showToast(result.message, 'success');
        navigate('/perfil');
      } else if (result) {
        showToast(result.message, 'error');
      } else {
        showToast('Erro ao resgatar cupom', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao resgatar cupom', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-10">

      {/* HEADER */}
      <div className="flex items-center px-4 pt-5 pb-3 sticky top-0 bg-[#f1f1f2] z-10">
        <button onClick={() => navigate('/perfil')} className="mr-4 active:opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
          </svg>
        </button>
        <span className="text-[18px] font-semibold flex-1">Resgatar Código</span>
      </div>

      <form onSubmit={handleSubmit} id="redeem-coupon-form" className="px-3 flex flex-col gap-4">

        {/* Icon */}
        <div className="flex flex-col items-center py-6">
          <div className="w-[72px] h-[72px] rounded-[22px] bg-[#b375d6] flex items-center justify-center mb-3 shadow-[0_4px_12px_rgba(179,117,214,0.3)]">
            <Tag className="w-9 h-9 text-white" strokeWidth={1.8} />
          </div>
          <p className="text-[13px] text-[#8e8e93] text-center max-w-[260px] leading-snug">
            Introduza o código de cupom para adicionar saldo à sua conta.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-white rounded-[16px] overflow-hidden">
          <div className="flex items-center px-4 h-[52px]">
            <input
              type="text"
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder="Introduza o código"
              value={coupon}
              onChange={handleCouponChange}
              maxLength={20}
            />
          </div>
        </div>

        <p className="text-[13px] text-[#8e8e93] px-2">
          O código é composto por letras maiúsculas e números. Exemplo: <span className="font-mono font-semibold text-black">TGRAM2024</span>
        </p>

        {/* Submit */}
        <button
          type="submit"
          form="redeem-coupon-form"
          disabled={isSubmitting || !coupon || coupon.length < 5}
          className="w-full h-[50px] rounded-[16px] bg-[#25D366] text-white font-semibold text-[16px] flex items-center justify-center disabled:opacity-40 active:scale-[0.99] transition-transform shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
        >
          {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'Resgatar'}
        </button>
      </form>
    </div>
  );
}
