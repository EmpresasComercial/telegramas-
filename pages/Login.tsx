import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { Eye, EyeOff, Loader2, ChevronDown, Phone } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [passkey, setPasskey] = useState('');

  // Auto-filled phone from localStorage (saved on registration)
  const [savedPhone, setSavedPhone] = useState('');
  const [savedDialCode, setSavedDialCode] = useState('');
  const [savedCountryName, setSavedCountryName] = useState('');
  const [hasSavedPhone, setHasSavedPhone] = useState(false);

  // Load saved phone on mount
  useEffect(() => {
    const phone = localStorage.getItem('saved_phone') || '';
    const dial  = localStorage.getItem('saved_dial_code') || '';
    const name  = localStorage.getItem('saved_country_name') || '';
    if (phone) {
      setSavedPhone(phone);
      setSavedDialCode(dial);
      setSavedCountryName(name);
      setHasSavedPhone(true);
    }
  }, []);

  const togglePasskey = useCallback(() => setShowPasskey(v => !v), []);

  // Restrict input to numeric digits, max 6
  const handlePasskeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPasskey(val);
  }, []);

  // Format phone for display: groups of 3 digits
  const formatPhone = (phone: string) =>
    phone.replace(/(\d{3})(?=\d)/g, '$1 ');

  // Switch account: clear saved phone and go to register
  const handleSwitchAccount = () => {
    localStorage.removeItem('saved_phone');
    localStorage.removeItem('saved_dial_code');
    localStorage.removeItem('saved_country_name');
    navigate('/messager');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPasskey = passkey.trim();
    if (!cleanPasskey || cleanPasskey.length !== 6) {
      showToast('Ops! A Chave de Acesso deve ter exactamente 6 dígitos numéricos.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (hasSavedPhone) {
        // ── FAST PATH: phone is known, sign in directly ──────────────────
        const { data, error } = await supabase.auth.signInWithPassword({
          email: `${savedPhone}@user.com`,
          password: cleanPasskey,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            showToast('Ops! Chave de acesso incorrecta. Tente novamente.', 'error');
          } else {
            throw error;
          }
          setIsSubmitting(false);
          return;
        }

        if (data.session) {
          showToast('Bem-vindo de volta!', 'success');
          navigate('/home');
        } else {
          showToast('Não foi possível iniciar sessão. Verifique a sua chave.', 'error');
        }
      } else {
        // ── FALLBACK PATH: no saved phone, resolve via passkey lookup ─────
        const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
          'lookup_user_by_passkey_mcpn',
          { p_passkey: cleanPasskey, p_device_id: getDeviceId() }
        );

        if (rpcError) throw rpcError;

        const lookup = rpcData as {
          success: boolean;
          message?: string;
          phone?: string;
          passkey?: string;
        } | null;

        if (!lookup || !lookup.success || !lookup.phone) {
          showToast(lookup?.message || 'Ops! Chave de acesso inválida ou não encontrada.', 'error');
          setIsSubmitting(false);
          return;
        }

        const userAuthPassword = lookup.passkey || cleanPasskey;
        const { data, error } = await supabase.auth.signInWithPassword({
          email: `${lookup.phone}@user.com`,
          password: userAuthPassword,
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
          // Save phone for next time
          localStorage.setItem('saved_phone', lookup.phone);
          showToast('Login realizado com sucesso!', 'success');
          navigate('/home');
        } else {
          showToast('Não foi possível iniciar sessão. Verifique a sua chave.', 'error');
        }
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
          <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[110px] h-[110px]">
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

        <h1 className="text-[28px] font-semibold mb-1 text-center tracking-tight text-black">
          Telegram
        </h1>

        {hasSavedPhone ? (
          /* ── MODO: Número de telefone detectado automaticamente ── */
          <>
            <p className="text-[14px] text-[#707579] text-center mb-5 leading-snug max-w-[300px]">
              Bem-vindo de volta! Introduza a sua chave de acesso.
            </p>

            {/* Phone Number Card — displayed automatically like Mani Unitel */}
            <div className="w-full bg-[#f0f7ff] border border-[#bcd9f7] rounded-[22px] px-5 py-4 flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#3390ec] flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#3390ec] font-semibold uppercase tracking-wider mb-0.5">
                  {savedCountryName || 'Número registado'}
                </p>
                <p className="text-[22px] font-bold text-black tracking-tight leading-none">
                  {savedDialCode} {formatPhone(savedPhone)}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              {/* Passkey input */}
              <div className="relative w-full h-[46px] rounded-[22px] border border-[#c8c7cc] focus-within:border-[#3390ec] px-4 flex items-center transition-colors bg-white group mb-4">
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-[11px] text-[#707579] font-medium pointer-events-none group-focus-within:text-[#3390ec]">
                  Chave de Acesso (6 dígitos)
                </label>
                <input
                  name="passkey"
                  type={showPasskey ? 'text' : 'password'}
                  inputMode="numeric"
                  placeholder="••••••"
                  maxLength={6}
                  className="flex-1 h-full bg-transparent outline-none text-[22px] text-black font-bold tracking-widest text-center pr-10"
                  value={passkey}
                  onChange={handlePasskeyChange}
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

              {/* Login button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[46px] rounded-[22px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-semibold text-[14px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center shadow-sm mb-5"
              >
                {isSubmitting
                  ? <Loader2 className="animate-spin h-5 w-5 text-white" />
                  : 'ENTRAR'
                }
              </button>

              {/* Switch account */}
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="flex items-center gap-1.5 text-[13px] text-[#707579] hover:text-[#3390ec] transition-colors active:scale-95"
              >
                <ChevronDown className="w-4 h-4" />
                Usar outra conta
              </button>
            </form>
          </>
        ) : (
          /* ── MODO: Sem número guardado — pede só a chave de acesso ── */
          <>
            <p className="text-[14px] text-[#707579] text-center mb-2 leading-snug max-w-[300px]">
              Introduza a sua Chave de Acesso de 6 dígitos para entrar.
            </p>
            <p className="text-[11px] text-[#a2acb4] text-center mb-6 leading-snug max-w-[280px]">
              5 dígitos do meio do seu nº de telefone + 1 dígito escolhido por si
            </p>

            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              <div className="relative w-full h-[46px] rounded-[22px] border border-[#c8c7cc] focus-within:border-[#3390ec] px-4 flex items-center transition-colors bg-white group mb-4">
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-[11px] text-[#707579] font-medium pointer-events-none group-focus-within:text-[#3390ec]">
                  Chave de Acesso (6 dígitos)
                </label>
                <input
                  name="passkey"
                  type={showPasskey ? 'text' : 'password'}
                  inputMode="numeric"
                  placeholder="••••••"
                  maxLength={6}
                  className="flex-1 h-full bg-transparent outline-none text-[22px] text-black font-bold tracking-widest text-center pr-10"
                  value={passkey}
                  onChange={handlePasskeyChange}
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[46px] rounded-[22px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-semibold text-[14px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center shadow-sm"
              >
                {isSubmitting
                  ? <Loader2 className="animate-spin h-5 w-5 text-white" />
                  : t('auth.login')
                }
              </button>

              <p className="text-[14px] text-[#707579] text-center mt-6">
                {t('auth.no_account')}{' '}
                <Link to="/messager" className="text-[#3390ec] font-semibold hover:underline uppercase text-[13px] tracking-wider ml-1">
                  {t('auth.signup_button')}
                </Link>
              </p>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
