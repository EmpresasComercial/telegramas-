import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ChevronDown, Loader2, CreditCard } from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const CARD_NAMES = [
  'Banco BAI',
  'Banco BFA',
  'Banco BIC',
  'Banco SOL',
  'Banco Atlântico'
];

interface BankResponse {
  success: boolean;
  message: string;
}

export default function AddBank() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    holderName: '',
    cardName: ''
  });

  useEffect(() => {
    const stateBank = (location.state as any)?.bank;
    if (stateBank) {
      const cleanIban = (stateBank.iban || '').replace(/^AO06/i, '');
      setFormData({
        cardNumber: cleanIban,
        holderName: stateBank.owner_name || stateBank.holder_name || '',
        cardName: stateBank.bank_name || ''
      });
      return;
    }
    async function loadExistingBank() {
      try {
        const { data, error } = await supabase.rpc('get_my_bank_accounts_mcpn');
        if (!error && data && data.length > 0) {
          const bank = data[0];
          const cleanIban = (bank.iban || '').replace(/^AO06/i, '');
          setFormData({
            cardNumber: cleanIban,
            holderName: bank.owner_name || (bank as any).holder_name || '',
            cardName: bank.bank_name || ''
          });
        }
      } catch {}
    }
    loadExistingBank();
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'cardNumber') sanitized = value.replace(/\D/g, '');
    else if (name === 'holderName') sanitized = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').replace(/\s\s+/g, ' ');
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cardNumber || formData.cardNumber.length < 5) {
      showToast('Por favor, insira o número do cartão válido.', 'error');
      return;
    }
    if (!formData.holderName.trim() || formData.holderName.trim().length < 3) {
      showToast('Por favor, preencha o nome do titular.', 'error');
      return;
    }
    if (!formData.cardName) {
      showToast('Por favor, selecione o nome do cartão.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const fullIban = formData.cardNumber.startsWith('AO06') ? formData.cardNumber : `AO06${formData.cardNumber}`;
      const { data, error } = await supabase.rpc('save_bank_data_mcpn', {
        p_bank_name: formData.cardName,
        p_holder_name: formData.holderName.trim(),
        p_iban: fullIban
      }) as { data: BankResponse | null; error: any };

      if (error) throw error;
      if (data && data.success) {
        showToast(data.message || 'Cartão salvo com sucesso!', 'success');
        navigate(redirectPath || '/informacao-bancaria');
      } else {
        showToast(data?.message || 'Falha ao salvar cartão.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar cartão.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-10">

      {/* HEADER */}
      <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0 z-10">
        <button onClick={() => navigate(redirectPath || '/settings')} className="mr-4 active:opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
          </svg>
        </button>
        <span className="text-[18px] font-semibold flex-1">Cartão Bancário</span>
      </div>

      <form onSubmit={handleSubmit} id="add-card-form" className="px-3 flex flex-col gap-4">

        {/* Icon header */}
        <div className="flex flex-col items-center py-6">
          <div className="w-[72px] h-[72px] rounded-[22px] bg-[#3390ec] flex items-center justify-center mb-3 shadow-[0_4px_12px_rgba(51,144,236,0.3)]">
            <CreditCard className="w-9 h-9 text-white" strokeWidth={1.8} />
          </div>
          <p className="text-[13px] text-[#8e8e93] text-center max-w-[260px] leading-snug">
            Adicione o seu cartão bancário para efectuar levantamentos.
          </p>
        </div>

        {/* Fields card */}
        <div className="bg-white rounded-[16px] overflow-hidden">
          {/* Card number */}
          <div className="flex items-center px-4 h-[52px] border-b border-[#e5e5e5]">
            <input
              name="cardNumber"
              type="tel"
              inputMode="numeric"
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder="Número do IBAN (sem AO06)"
              value={formData.cardNumber}
              onChange={handleChange}
            />
          </div>

          {/* Holder name */}
          <div className="flex items-center px-4 h-[52px] border-b border-[#e5e5e5]">
            <input
              name="holderName"
              type="text"
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder="Nome do titular"
              value={formData.holderName}
              onChange={handleChange}
            />
          </div>

          {/* Bank selector */}
          <div className="flex items-center px-4 h-[52px] relative">
            <select
              name="cardName"
              className={`w-full h-full bg-transparent outline-none text-[16px] font-normal cursor-pointer appearance-none pr-8 ${
                formData.cardName ? 'text-black' : 'text-[#c7c7cc]'
              }`}
              value={formData.cardName}
              onChange={handleChange}
            >
              <option value="" disabled>Selecionar banco</option>
              {CARD_NAMES.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            <ChevronDown className="w-5 h-5 text-[#c7c7cc] absolute right-4 pointer-events-none" strokeWidth={1.8} />
          </div>
        </div>

        {/* Hint */}
        <p className="text-[13px] text-[#8e8e93] px-2">
          O IBAN deve ser inserido sem o prefixo AO06. O prefixo será adicionado automaticamente.
        </p>

        {/* Submit */}
        <button
          type="submit"
          form="add-card-form"
          disabled={isSubmitting || !formData.cardNumber || !formData.holderName || !formData.cardName}
          className="w-full h-[50px] rounded-[16px] bg-[#25D366] text-white font-semibold text-[16px] flex items-center justify-center disabled:opacity-40 active:scale-[0.99] transition-transform shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
        >
          {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'Salvar Cartão'}
        </button>

      </form>
    </div>
  );
}
