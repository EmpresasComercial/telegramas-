import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { subscribeToPushNotifications } from '../lib/pushNotifications';
import { Eye, EyeOff, Loader2, Download, Bell, X, ShieldCheck, Search, Check } from 'lucide-react';
import { COUNTRIES, Country } from '../lib/countries';

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ phone: '', inviteCode: '', password: '' });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // New states for Telegram layout
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPwaPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);

    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallPWA = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPwaPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          showToast('Instalando aplicativo...', 'success');
        }
        setDeferredPrompt(null);
        (window as any).deferredPwaPrompt = null;
      } catch (err) {
        console.error('Erro ao acionar prompt PWA:', err);
      }
    } else {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
        showToast('Aplicativo já instalado no dispositivo!', 'success');
      } else {
        showToast('Iniciando instalação do aplicativo...', 'info');
      }
    }
  };

  useEffect(() => {
    const code = searchParams.get('join') || searchParams.get('invite') || searchParams.get('code') || searchParams.get('ref');
    if (code) setFormData(prev => ({ ...prev, inviteCode: code.toUpperCase() }));
  }, [searchParams]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'phone') {
      sanitized = value.replace(/\D/g, '').slice(0, selectedCountry.maxLength);
    } else if (name === 'inviteCode') {
      sanitized = value.replace(/\D/g, '').slice(0, 10);
    } else {
      sanitized = value.trim();
    }
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  }, [selectedCountry.maxLength]);

  const togglePassword = useCallback(() => setShowPassword(v => !v), []);

  const validateForm = () => {
    if (!formData.phone || formData.phone.length < Math.max(7, selectedCountry.maxLength - 2)) {
      showToast(t('auth.phone_error_length'), 'error');
      return false;
    }
    if (formData.password.length < 8) {
      showToast(t('auth.password_error_length'), 'error');
      return false;
    }
    if (!formData.inviteCode || formData.inviteCode.length !== 10) {
      showToast(t('auth.invite_error_length'), 'error');
      return false;
    }
    return true;
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minLen = Math.max(6, selectedCountry.maxLength - 2);
    if (!formData.phone || formData.phone.length < minLen) {
      showToast(`Por favor insira um número válido (${selectedCountry.maxLength} dígitos para ${selectedCountry.name})`, 'error');
      return;
    }
    setShowPasswordModal(true);
  };

  const handleRegisterClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowPasswordModal(false);
    executeRegistration();
  };

  const executeRegistration = async () => {
    setIsSubmitting(true);
    try {
      const { data: rpcData, error: vError } = await supabase.rpc('secure_registration_mcpn', {
        p_phone: formData.phone,
        p_invite_code: formData.inviteCode.toUpperCase(),
        p_device_id: getDeviceId()
      });

      if (vError) throw vError;

      const validation = rpcData as { success: boolean; message: string } | null;
      if (validation && !validation.success) {
        showToast(validation.message || 'Código de convite inválido', 'error');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: `${formData.phone}@user.com`,
        password: formData.password,
        options: {
          data: {
            phone: formData.phone,
            referred_by: formData.inviteCode.toUpperCase(),
            device_id: getDeviceId()
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          showToast(t('auth.phone_error_exists') || 'Celular registrado.', 'error');
        } else {
          throw error;
        }
        return;
      }

      if (data.user) {
        if ('Notification' in window && Notification.permission === 'granted') {
          subscribeToPushNotifications().catch(() => {});
        }
        showToast(t('auth.signup_success') || (data.session ? 'Registrado!' : 'Conta criada! Faça login.'), 'success');
        navigate(data.session ? '/home' : '/login');
      }
    } catch (err: any) {
      let msg = err.message || 'Falhou, tente novamente';
      if (msg.includes('email rate limit exceeded')) msg = 'Limite de tentativas excedido, tente outra hora';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCountries = useMemo(() => {
    if (!searchCountry) return COUNTRIES;
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(searchCountry.toLowerCase()) || 
      c.dial_code.includes(searchCountry)
    );
  }, [searchCountry]);

  return (
    <div className="w-full min-h-screen bg-white pb-12 font-sans antialiased text-black select-none flex flex-col items-center">
      {/* Header section */}
      <div className="w-full max-w-[400px] flex justify-end p-4">
        <LanguageSelector />
      </div>

      <main className="w-full max-w-[400px] px-4 flex flex-col items-center mt-2">
        {/* Logo Telegram */}
        <div className="mb-5 flex items-center justify-center">
          <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[100px] h-[100px]">
            <defs>
              <linearGradient id="tgSignupGrad" x1=".667" x2=".417" y1=".167" y2=".75">
                <stop offset="0" stopColor="#37aee2"/>
                <stop offset="1" stopColor="#1e96c8"/>
              </linearGradient>
            </defs>
            <circle cx="120" cy="120" r="120" fill="url(#tgSignupGrad)"/>
            <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232"/>
            <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"/>
            <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
          </svg>
        </div>

        <h1 className="text-[28px] font-bold mb-2 text-center tracking-tight">Telegram Business</h1>
        
        <p className="text-[15px] text-[#8e8e93] text-center mb-8 leading-snug">
          Por favor, confirme o código do seu país e digite o seu número de telefone.<br />
          ou <Link to="/login" className="text-[#3390ec] hover:underline">inicie sessão com Passkey &gt;</Link>
        </p>

        <form onSubmit={handlePhoneSubmit} className="w-full flex flex-col">
          <div className="w-full border-y border-[#c8c7cc] bg-white">
            <div 
              className="flex items-center justify-between h-[50px] px-4 border-b border-[#c8c7cc] cursor-pointer active:bg-gray-50"
              onClick={() => setShowCountryModal(true)}
            >

              <div className="flex items-center gap-2">
                <img
                  src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                  alt={selectedCountry.name}
                  className="w-7 h-auto rounded-sm object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-[#3390ec] text-[17px]">{selectedCountry.name}</span>
              </div>
              <div className="text-[#c8c7cc] font-bold text-[18px]">&gt;</div>
            </div>

            <div className="flex items-center h-[50px] px-4 relative">
              <span className="text-[17px] text-black mr-2 min-w-[45px] border-r border-[#c8c7cc] leading-[30px] pr-2">
                {selectedCountry.dial_code}
              </span>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder={`${'0'.repeat(selectedCountry.maxLength)} dígitos`}
                className="flex-1 h-full bg-transparent outline-none text-[17px] text-black placeholder:text-[#c8c7cc]"
                value={formData.phone}
                onChange={handleChange}
                maxLength={selectedCountry.maxLength}
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-[52px] rounded-[16px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-medium text-[17px] transition-all disabled:opacity-50 flex items-center justify-center mt-6 shadow-sm"
          >
            Continue
          </button>
        </form>
      </main>

      {/* MODAL DE PAÍSES */}
      <AnimatePresence>
        {showCountryModal && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
          >
            <div className="h-[56px] px-4 flex items-center border-b border-[#c8c7cc] shrink-0 bg-[#f8f8f8]">
              <button 
                onClick={() => setShowCountryModal(false)}
                className="text-[#3390ec] text-[17px] font-medium"
              >
                Back
              </button>
              <h2 className="flex-1 text-center text-[17px] font-semibold">Choose a country</h2>
              <div className="w-[40px]"></div>
            </div>
            <div className="p-2 bg-[#f8f8f8] border-b border-[#c8c7cc] shrink-0">
              <div className="bg-[#e3e3e8] h-[36px] rounded-[10px] flex items-center px-3">
                <Search className="w-5 h-5 text-[#8e8e93] mr-2" />
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="bg-transparent outline-none flex-1 text-[16px] text-black"
                  value={searchCountry}
                  onChange={(e) => setSearchCountry(e.target.value)}
                />
                {searchCountry && (
                  <button onClick={() => setSearchCountry('')} className="bg-[#8e8e93] text-white rounded-full p-0.5 ml-2">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredCountries.map((c) => (
                <div 
                  key={c.code}
                  className="flex items-center px-4 h-[50px] border-b border-[#c8c7cc] active:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setSelectedCountry(c);
                    setFormData(prev => ({ ...prev, phone: '' }));
                    setShowCountryModal(false);
                    setSearchCountry('');
                  }}
                >
                  <img
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                    alt={c.name}
                    className="w-8 h-auto rounded-sm object-cover mr-3 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="flex-1 text-[17px] font-medium text-black">{c.name}</span>
                  <span className="text-[#8e8e93] text-[17px] mr-2">{c.dial_code}</span>
                  {selectedCountry.code === c.code && <Check className="w-5 h-5 text-[#3390ec]" />}
                </div>
              ))}
              {filteredCountries.length === 0 && (
                <div className="p-8 text-center text-[#8e8e93]">No countries found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMAÇÃO + SENHA */}
      <AnimatePresence>
        {showPasswordModal && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
              className="bg-white w-full max-w-[360px] rounded-[24px] overflow-hidden select-none font-sans antialiased shadow-xl pb-4"
            >
              <div className="pt-8 pb-4 px-6 text-center">
                <h2 className="text-[32px] font-bold text-black mb-2 tracking-tight">
                  {selectedCountry.dial_code} {formData.phone.replace(/(\d{3})(?=\d)/g, '$1 ')}
                </h2>
                <p className="text-[17px] text-[#202020] font-normal mb-4">
                  Is this the correct number?
                </p>
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  className="text-[#3390ec] text-[17px] font-medium"
                >
                  Edit
                </button>
              </div>

              <form onSubmit={handleRegisterClick} className="px-6 flex flex-col gap-4">
                <div className="bg-[#f0f0f0] rounded-[14px] h-[50px] px-4 flex items-center relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('auth.password_placeholder')}
                    className="flex-1 h-full bg-transparent outline-none text-[17px] text-black placeholder:text-[#8e8e93] pr-10"
                    value={formData.password}
                    onChange={handleChange}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={togglePassword}
                    className="absolute right-4 text-[#8e8e93] active:scale-95 transition-transform"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[54px] rounded-[16px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-semibold text-[17px] transition-all disabled:opacity-50 flex items-center justify-center shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 text-white" /> : "Continue"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
