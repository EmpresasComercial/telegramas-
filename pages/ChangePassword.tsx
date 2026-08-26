import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\s/g, '');
    setFormData(prev => ({ ...prev, [e.target.name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword.length < 8) {
      showToast(t('auth.password_error_length'), 'error');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showToast(t('password.match_error'), 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Sessão inválida. Faça login novamente.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword
      });
      if (signInError) throw new Error('A senha atual está incorreta.');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ password: formData.newPassword, current_password: formData.currentPassword })
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.msg || responseData.message || 'Erro ao atualizar a senha');

      showToast(t('password.success'), 'success');
      setTimeout(() => navigate('/settings'), 1500);
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f1f1f2] font-sans text-black pb-10">

      {/* HEADER */}
      <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0 z-10">
        <button onClick={() => navigate('/settings')} className="mr-4 active:opacity-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
          </svg>
        </button>
        <span className="text-[18px] font-semibold flex-1">Redefinir Senha de Segurança</span>
      </div>

      <form onSubmit={handleSubmit} id="change-pass-form" className="px-3 flex flex-col gap-4">

        {/* Icon header */}
        <div className="flex flex-col items-center py-6">
          <div className="w-[72px] h-[72px] rounded-[22px] bg-[#25D366] flex items-center justify-center mb-3 shadow-[0_4px_12px_rgba(37,211,102,0.3)]">
            <ShieldAlert className="w-9 h-9 text-white" strokeWidth={1.8} />
          </div>
          <p className="text-[13px] text-[#8e8e93] text-center max-w-[260px] leading-snug">
            Escolha uma senha forte com pelo menos 8 caracteres.
          </p>
        </div>

        {/* Fields card */}
        <div className="bg-white rounded-[16px] overflow-hidden">
          {/* Current password */}
          <div className="flex items-center px-4 h-[52px] border-b border-[#e5e5e5]">
            <input
              name="currentPassword"
              type={showCurrentPass ? 'text' : 'password'}
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder="Senha atual"
              value={formData.currentPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="ml-2 text-[#c7c7cc] active:opacity-50">
              {showCurrentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* New password */}
          <div className="flex items-center px-4 h-[52px] border-b border-[#e5e5e5]">
            <input
              name="newPassword"
              type={showNewPass ? 'text' : 'password'}
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder="Nova senha (mínimo 8 caracteres)"
              value={formData.newPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="ml-2 text-[#c7c7cc] active:opacity-50">
              {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm password */}
          <div className="flex items-center px-4 h-[52px]">
            <input
              name="confirmPassword"
              type={showConfirmPass ? 'text' : 'password'}
              className="flex-1 bg-transparent outline-none text-[16px] text-black placeholder:text-[#c7c7cc]"
              placeholder="Confirmar nova senha"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="ml-2 text-[#c7c7cc] active:opacity-50">
              {showConfirmPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          form="change-pass-form"
          disabled={isSubmitting || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
          className="w-full h-[50px] rounded-[16px] bg-[#25D366] text-white font-semibold text-[16px] flex items-center justify-center disabled:opacity-40 active:scale-[0.99] transition-transform shadow-[0_4px_12px_rgba(37,211,102,0.25)]"
        >
          {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'Redefinir Senha'}
        </button>

      </form>
    </div>
  );
}
