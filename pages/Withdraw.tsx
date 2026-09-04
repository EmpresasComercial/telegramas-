import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Wallet, AlertCircle } from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { useLanguage } from '../contexts/LanguageContext';
import { Skeleton } from '../components/Skeleton';

const MIN_WITHDRAW = 100;
const MAX_WITHDRAW = 100000;

const isWithdrawAllowed = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
};

export default function Withdraw() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasBank, setHasBank] = useState(false);
  const [bankId, setBankId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_withdraw_info_mcpn');
      if (error) throw error;
      if (data?.length > 0) {
        const d = data[0];
        setBalance(Number(d.balance));
        setHasBank(d.has_bank);
        setBankId(d.bank_id || null);
        setIsVerified(d.is_verified);
        setHasPending(d.has_pending);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('withdraw_balance_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sys_t500' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value.replace(/\D/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPending) { showToast(t('withdraw.pending_wait'), 'error'); return; }
    if (!isWithdrawAllowed()) { showToast(t('withdraw.time_error'), 'error'); return; }
    if (!isVerified) { showToast(t('withdraw.verify_required'), 'error'); navigate('/autenticacao'); return; }
    if (!hasBank) { showToast(t('withdraw.bank_required'), 'error'); navigate('/informacao-bancaria?redirect=/retirada'); return; }
    if (!password) { showToast(t('auth.password_error_empty'), 'error'); return; }

    const withdrawAmount = parseInt(amount);
    if (!amount || withdrawAmount < MIN_WITHDRAW) { showToast(t('withdraw.min_amount'), 'error'); return; }
    if (withdrawAmount > MAX_WITHDRAW) { showToast(t('withdraw.max_amount'), 'error'); return; }
    if (withdrawAmount > balance) { showToast(t('withdraw.insufficient'), 'error'); return; }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Sessão expirada.');
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (authError) { showToast(t('auth.password_error_wrong'), 'error'); return; }

      const { data, error } = await supabase.rpc('process_withdrawal_request', {
        p_amount: withdrawAmount,
        p_bank_id: bankId || '',
        p_password: password
      }) as { data: { success: boolean; message: string } | null; error: any };

      if (error) throw error;
      if (data?.success) { showToast(data.message, 'success'); navigate('/perfil'); }
      else showToast(data?.message || t('common.error'), 'error');
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const guideItems = [
    t('withdraw.guide_time'),
    t('withdraw.guide_limits'),
    t('withdraw.guide_tax'),
    t('withdraw.guide_support'),
  ];

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#f1f1f2] pb-10 font-sans flex flex-col px-3 pt-16">
        <Skeleton className="w-full h-[52px] rounded-[16px] mb-4" />
        <Skeleton className="w-full h-[104px] rounded-[16px] mb-4" />
        <Skeleton className="w-full h-[120px] rounded-[16px]" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-10">

      {/* HEADER */}
      <div className="flex items-center px-4 pt-5 pb-3 sticky top-0 bg-[#f1f1f2] z-10">
        <button onClick={() => navigate('/perfil')} className="mr-4 active:opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
          </svg>
        </button>
        <span className="text-[18px] font-semibold flex-1">Retirar Saldo</span>
      </div>

      <form onSubmit={handleSubmit} id="withdraw-form" className="px-3 flex flex-col gap-4">

        {/* Icon */}
        <div className="flex flex-col items-center py-4">
          <div className="w-[72px] h-[72px] rounded-[22px] bg-[#2481cc] flex items-center justify-center mb-3 shadow-[0_4px_12px_rgba(37,211,102,0.3)]">
            <Wallet className="w-9 h-9 text-white" strokeWidth={1.8} />
          </div>
        </div>

        {/* Balance display */}
        <div className="bg-white rounded-[16px] px-4 py-3 flex items-center justify-between">
          <span className="text-[14px] text-[#8e8e93]">Saldo disponível</span>
          <span className="text-[16px] font-bold text-[#2481cc]">{formatCurrency(balance, 'KZ')}</span>
        </div>

        {/* Inputs card */}
        <div className="bg-white rounded-[16px] overflow-hidden">
          <div className="flex items-center px-4 h-[52px] border-b border-[#e5e5e5]">
            <input
              type="tel"
              placeholder={`Valor a retirar (mín. ${MIN_WITHDRAW} Kz)`}
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              value={amount}
              onChange={handleAmountChange}
            />
            <span className="text-[13px] font-semibold text-[#2481cc] ml-2">KZ</span>
          </div>
          <div className="flex items-center px-4 h-[52px]">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha de login"
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword(p => !p)} className="ml-2 text-[#c7c7cc] active:opacity-50">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Pending warning */}
        {hasPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-[16px] px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-yellow-700">Existe um pedido de retirada pendente. Aguarde a aprovação antes de solicitar outro.</p>
          </div>
        )}

        {/* Guide card */}
        <div className="bg-white rounded-[16px] px-4 py-4">
          <p className="text-[13px] font-semibold text-[#2481cc] mb-2">Instruções de Retirada</p>
          <div className="space-y-2">
            {guideItems.map((text, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-[#2481cc] mt-0.5 text-[13px]">•</span>
                <span className="text-[13px] text-[#8e8e93] leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          form="withdraw-form"
          disabled={isSubmitting || hasPending || !amount || parseInt(amount) < MIN_WITHDRAW}
          className="w-full h-[50px] rounded-[16px] bg-[#2481cc] text-white font-semibold text-[16px] flex items-center justify-center disabled:opacity-40 active:scale-[0.99] transition-transform shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
        >
          {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'Confirmar Retirada'}
        </button>
      </form>
    </div>
  );
}
