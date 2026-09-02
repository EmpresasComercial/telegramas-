import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Check, Loader2 } from 'lucide-react';

interface RechargeResponse {
  success: boolean;
  recharge_id?: string;
  message?: string;
}

export default function Recharge() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');

  const MIN_RECHARGE = 3000;
  const MAX_RECHARGE = 500000;

  useEffect(() => {
    async function fetchBanks() {
      const { data, error } = await supabase.rpc('get_collection_banks_mcpn');
      if (!error && data) {
        setBanks(data);
        if (data.length > 0) {
          setSelectedBankId(data[0].id);
        }
      }
    }
    fetchBanks();
  }, []);



  const numAmount = parseInt(amount || '0', 10);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val);
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigate('/perfil');
    }
  };

  const handleNextStep1 = () => {
    if (numAmount < MIN_RECHARGE) {
      showToast(`Valor mínimo de recarga é ${MIN_RECHARGE.toLocaleString()} Kz.`, 'error');
      return;
    }
    if (numAmount > MAX_RECHARGE) {
      showToast(`Valor máximo de recarga é ${MAX_RECHARGE.toLocaleString()} Kz.`, 'error');
      return;
    }
    setCurrentStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!selectedBankId) {
      showToast('Por favor, selecione um banco.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('request_recharge_kz_mcpn', {
        p_amount: numAmount,
        p_bank_id: selectedBankId
      }) as { data: RechargeResponse | null; error: any };

      if (error) throw error;

      if (data && data.success) {
        navigate(`/payMoney?id=${data.recharge_id}&amount=${numAmount}&bankId=${selectedBankId}`);
      } else {
        showToast(data?.message || 'Falhou, tente novamente', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Falha no servidor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-10">

      {/* HEADER */}
      <div className="flex items-center px-4 pt-5 pb-3 sticky top-0 bg-[#f1f1f2] z-10">
        <button onClick={handleBack} className="mr-4 active:opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
          </svg>
        </button>
        <span className="text-[18px] font-semibold flex-1">Adicionar Saldo</span>
        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${currentStep >= 1 ? 'bg-[#25D366] text-white' : 'bg-gray-200 text-gray-500'}`}>
            {currentStep >= 2 ? <Check className="w-3.5 h-3.5" /> : '1'}
          </div>
          <div className={`w-5 h-[2px] rounded ${currentStep >= 2 ? 'bg-[#25D366]' : 'bg-gray-200'}`} />
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${currentStep >= 2 ? 'bg-[#25D366] text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          <div className="w-5 h-[2px] rounded bg-gray-200" />
          <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[11px] font-bold">3</div>
        </div>
      </div>

      <div className="px-3 flex flex-col gap-4">

        {/* Icon */}
        <div className="flex flex-col items-center py-4">
          <div className="w-[72px] h-[72px] rounded-[22px] bg-[#3390ec] flex items-center justify-center mb-3 shadow-[0_4px_12px_rgba(51,144,236,0.3)]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
        </div>

        {currentStep === 1 && (
          <>
            {/* Amount input */}
            <div className="bg-white rounded-[16px] overflow-hidden">
              <div className="flex items-center px-4 h-[52px]">
                <input
                  type="tel"
                  inputMode="numeric"
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
                  placeholder="Digite o valor (mín. 3.000 Kz)"
                  value={amount}
                  onChange={handleAmountChange}
                />
                <span className="text-[14px] font-semibold text-[#25D366] ml-2">KZ</span>
              </div>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2">
              {[3000, 10000, 50000, 100000, 150000, 200000, 300000, 500000].map(val => {
                const isSelected = amount === val.toString();
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`h-[38px] rounded-[12px] text-[12px] font-semibold transition-all border flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-[#e5f5e9] text-[#25D366] border-[#25D366]'
                        : 'bg-white text-black border-gray-200 active:bg-gray-50'
                    }`}
                  >
                    {val.toLocaleString('pt-PT')}
                  </button>
                );
              })}
            </div>

            {/* Info card */}
            <div className="bg-white rounded-[16px] px-4 py-4">
              <p className="text-[13px] font-semibold text-[#25D366] mb-2">Instruções de Depósito</p>
              <div className="space-y-2">
                {[
                  'Recarregue no horário das 09:00 às 21:00.',
                  'Valor mínimo: 3.000 Kz. Máximo: 500.000 Kz.',
                  'Depósitos entre bancos iguais chegam em 5 a 10 minutos.',
                  'Se o valor não for creditado, contacte o suporte.',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#25D366] text-[13px]">•</span>
                    <span className="text-[13px] text-[#8e8e93] leading-snug">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextStep1}
              disabled={!amount}
              className="w-full h-[50px] rounded-[16px] bg-[#25D366] text-white font-semibold text-[16px] flex items-center justify-center disabled:opacity-40 active:scale-[0.99] transition-transform shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
            >
              Continuar
            </button>
          </>
        )}

        {currentStep === 2 && (
          <>
            {/* Amount summary */}
            <div className="bg-white rounded-[16px] px-4 py-3 flex items-center justify-between">
              <span className="text-[14px] text-[#8e8e93]">Valor selecionado</span>
              <span className="text-[16px] font-bold text-[#25D366]">{numAmount.toLocaleString('pt-PT')} Kz</span>
            </div>

            {/* Bank list */}
            <div className="bg-white rounded-[16px] overflow-hidden">
              <div className="px-4 pt-3 pb-1">
                <span className="text-[13px] font-semibold text-[#25D366]">Selecionar Banco</span>
              </div>
              {banks.length > 0 ? banks.map((bank, idx) => {
                const isSelected = selectedBankId === bank.id;
                return (
                  <div
                    key={bank.id}
                    onClick={() => setSelectedBankId(bank.id)}
                    className={`flex items-center px-4 py-3 cursor-pointer active:bg-gray-50 ${idx < banks.length - 1 ? 'border-b border-[#e5e5e5]' : ''}`}
                  >
                    <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center mr-4 shrink-0 ${isSelected ? 'border-[#25D366]' : 'border-gray-300'}`}>
                      {isSelected && <div className="w-[10px] h-[10px] rounded-full bg-[#25D366]" />}
                    </div>
                    <span className={`text-[16px] ${isSelected ? 'font-semibold text-black' : 'text-black font-normal'}`}>{bank.nome_banco}</span>
                  </div>
                );
              }) : (
                <div className="py-6 text-center text-[13px] text-[#8e8e93]">A carregar bancos disponíveis...</div>
              )}
            </div>

            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting || !selectedBankId}
              className="w-full h-[50px] rounded-[16px] bg-[#25D366] text-white font-semibold text-[16px] flex items-center justify-center disabled:opacity-40 active:scale-[0.99] transition-transform shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'Continuar'}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
