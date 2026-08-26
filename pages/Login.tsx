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
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ phone: '', password: '' });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitized = name === 'phone'
      ? value.replace(/\D/g, '').slice(0, 9)
      : value.trim();
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  }, []);

  const togglePassword = useCallback(() => setShowPassword(v => !v), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone || formData.phone.length !== 9) {
      showToast(t('auth.phone_error_length'), 'error');
      return;
    }
    if (!formData.password) {
      showToast(t('auth.password_error_empty'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${formData.phone}@user.com`,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showToast('Celular ou senha incorretos.', 'error');
        } else if (error.message.includes('Email not confirmed')) {
          showToast('Por favor, confirme sua conta antes de fazer login.', 'error');
        } else {
          showToast(error.message, 'error');
        }
        return;
      }

      if (data.session) {
        showToast('Login realizado com sucesso!', 'success');
        navigate('/home');
      } else {
        showToast('Nao foi possivel iniciar sessao. Verifique os seus dados.', 'error');
      }
    } catch {
      showToast('Falhou, verifique a conexao.', 'error');
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
        {/* Logo Telegram */}
        <div className="mb-5 flex items-center justify-center">
          <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[100px] h-[100px]">
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

        <h1 className="text-[28px] font-bold mb-2 text-center tracking-tight">
          Telegram Business
        </h1>

        <p className="text-[15px] text-[#8e8e93] text-center mb-8 leading-snug">
          Por favor, confirme o código do seu país<br />e digite o seu número de telefone.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col">
          {/* Campos agrupados estilo iOS */}
          <div className="w-full border-y border-[#c8c7cc] bg-white">
            {/* Campo telefone */}
            <div className="flex items-center h-[50px] px-4 border-b border-[#c8c7cc] relative">
              <span className="text-[17px] text-black mr-2 min-w-[45px] border-r border-[#c8c7cc] leading-[30px] pr-2">
                +244
              </span>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder={t('auth.phone_placeholder')}
                className="flex-1 h-full bg-transparent outline-none text-[17px] text-black placeholder:text-[#c8c7cc]"
                value={formData.phone}
                onChange={handleChange}
                maxLength={9}
                autoFocus
              />
            </div>

            {/* Campo senha */}
            <div className="flex items-center h-[50px] px-4 relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t('auth.password_placeholder')}
                className="flex-1 h-full bg-transparent outline-none text-[17px] text-black placeholder:text-[#c8c7cc] pr-10"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-4 text-[#c8c7cc] active:scale-95 transition-transform"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Botão Login — pill shape azul Telegram */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[52px] rounded-[16px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-medium text-[17px] transition-all disabled:opacity-50 flex items-center justify-center mt-6 shadow-sm"
          >
            {isSubmitting
              ? <Loader2 className="animate-spin h-5 w-5 text-white" />
              : t('auth.login')
            }
          </button>

          {/* Link para cadastro */}
          <p className="text-[15px] text-[#8e8e93] text-center mt-5">
            {t('auth.no_account')}{' '}
            <Link to="/cadastro" className="text-[#3390ec] font-medium hover:underline">
              {t('auth.signup_button')}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
