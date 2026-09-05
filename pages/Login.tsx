import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [passkey, setPasskey] = useState('');

  const togglePasskey = useCallback(() => setShowPasskey(v => !v), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPasskey = passkey.trim();
    if (!cleanPasskey) {
      showToast('Ops! Por favor introduza a sua chave de acesso.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Resolve user phone from database using the provided Passkey / Access Key
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('lookup_user_by_passkey_mcpn', {
        p_passkey: cleanPasskey
      });

      if (rpcError) throw rpcError;

      const lookup = rpcData as { success: boolean; message?: string; phone?: string } | null;
      if (!lookup || !lookup.success || !lookup.phone) {
        showToast(lookup?.message || 'Ops! Chave de acesso inválida ou não encontrada.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Sign in seamlessly with resolved phone credentials
      const defaultPassword = `${lookup.phone}Pass123!`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${lookup.phone}@user.com`,
        password: defaultPassword,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showToast('Ops! Credenciais inválidas para esta chave de acesso.', 'error');
        } else {
          throw error;
        }
        return;
      }

      if (data.session) {
        showToast('Login realizado com sucesso!', 'success');
        navigate('/home');
      } else {
        showToast('Não foi possível iniciar sessão. Verifique a sua chave.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ops! Ocorreu uma falha na conexão. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white pb-12 font-sans antialiased text-black select-none flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-[400px] flex justify-end p-4">
        <LanguageSelector />
      </div>

      <main className="w-full max-w-[400px] px-4 flex flex-col items-center mt-2">
        {/* Official Telegram Logo */}
        <div className="mb-6 flex items-center justify-center">
          <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[120px] h-[120px]">
            <defs>
              <linearGradient id="tgLoginGrad" x1=".667" x2=".417" y1=".167" y2=".75">
                <stop offset="0" stopColor="#37aee2"/>
                <stop offset="1" stopColor="#1e96c8"/>
              </linearGradient>
            </defs>
            <circle cx="120" cy="120" r="120" fill="url(#tgLoginGrad)"/>
            <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232"/>
            <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"/>
            <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
          </svg>
        </div>

        <h1 className="text-[30px] font-semibold mb-2 text-center tracking-tight text-black">
          Telegram
        </h1>

        <p className="text-[15px] text-[#707579] text-center mb-8 leading-snug max-w-[320px]">
          Por favor, introduza a sua Chave de Acesso para entrar na sua conta.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
          {/* Single Input Field: Passkey / Chave de Acesso */}
          <div className="relative w-full h-[54px] rounded-[20px] border border-[#c8c7cc] focus-within:border-[#3390ec] px-4 flex items-center transition-colors bg-white group mb-6">
            <label className="absolute -top-2.5 left-4 bg-white px-1 text-[12px] text-[#707579] font-medium pointer-events-none group-focus-within:text-[#3390ec]">
              Passkey / Chave de Acesso
            </label>
            <input
              name="passkey"
              type={showPasskey ? 'text' : 'password'}
              placeholder="Digite a sua chave de acesso"
              className="flex-1 h-full bg-transparent outline-none text-[16px] text-black font-normal pr-10"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={togglePasskey}
              className="absolute right-4 text-[#707579] hover:text-[#3390ec] active:scale-95 transition-transform"
              aria-label={showPasskey ? 'Ocultar chave' : 'Mostrar chave'}
            >
              {showPasskey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Botão Entrar — azul Telegram oficial */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[52px] rounded-[20px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-semibold text-[15px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center shadow-sm"
          >
            {isSubmitting
              ? <Loader2 className="animate-spin h-5 w-5 text-white" />
              : t('auth.login')
            }
          </button>

          {/* Link para cadastro */}
          <p className="text-[15px] text-[#707579] text-center mt-6">
            {t('auth.no_account')}{' '}
            <Link to="/messager" className="text-[#3390ec] font-semibold hover:underline uppercase text-[14px] tracking-wider ml-1">
              {t('auth.signup_button')}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
