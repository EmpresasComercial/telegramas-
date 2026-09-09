import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { subscribeToPushNotifications } from '../lib/pushNotifications';
import { Loader2, Search, X, Check, Copy, CheckCircle, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { COUNTRIES, Country } from '../lib/countries';

export default function Messager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ phone: '', inviteCode: '' });

  // User password (senha)
  const [userPasskey, setUserPasskey] = useState('');
  const [showUserPasskey, setShowUserPasskey] = useState(false);

  // Captcha "Não sou um robô"
  const [isRobotVerified, setIsRobotVerified] = useState(false);

  // Passkey reveal dialog
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);
  const [generatedPasskey, setGeneratedPasskey] = useState('');
  const [passkeyDialogCopied, setPasskeyDialogCopied] = useState(false);

  // Country / modals
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');

  // Capture invite code from URL (suporta /messager?join=Wme9, /messager?Wme9, etc.)
  useEffect(() => {
    let code = searchParams.get('join') || searchParams.get('invite') || searchParams.get('code') || searchParams.get('ref');
    
    if (!code) {
      const rawSearch = window.location.search ? window.location.search.replace(/^\?/, '').trim() : '';
      if (rawSearch) {
        code = rawSearch.includes('=') ? rawSearch.split('=')[1] : rawSearch;
      }
    }

    if (code) {
      const cleanCode = code.trim().slice(0, 6);
      setFormData(prev => ({ ...prev, inviteCode: cleanCode }));
    }
  }, [searchParams]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'phone') {
      sanitized = value.replace(/\D/g, '').slice(0, selectedCountry.maxLength);
    }
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  }, [selectedCountry.maxLength]);

  // ── Submit registration direta sem código de verificação ───────────────────
  const executeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone || formData.phone.length < 6) {
      showToast(`Por favor, insira um número de telefone válido.`, 'error');
      return;
    }

    if (!userPasskey || userPasskey.trim().length < 6) {
      showToast('Por favor, insira uma senha com no mínimo 6 caracteres.', 'error');
      return;
    }

    if (!formData.inviteCode || formData.inviteCode.trim().length < 3) {
      showToast('Por favor, insira o código de convite.', 'error');
      return;
    }

    if (!isRobotVerified) {
      showToast('Por favor, confirme a verificação "Não sou um robô".', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Validar código de convite via RPC oficial de segurança
      const { data: rpcData, error: vError } = await supabase.rpc('secure_registration_mcpn', {
        p_phone: formData.phone,
        p_invite_code: formData.inviteCode,
        p_device_id: getDeviceId()
      });

      if (vError) {
        throw vError;
      }

      const validation = rpcData as { success: boolean; message: string } | null;
      if (validation && !validation.success) {
        showToast(validation.message || 'Ops! Código de convite inválido ou expirado.', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Registar utilizador no Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: `${formData.phone}@user.com`,
        password: userPasskey,
        options: {
          data: {
            phone: formData.phone,
            referred_by: formData.inviteCode,
            device_id: getDeviceId()
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          showToast('Ops! Este número de telefone já está cadastrado. Conecte-se.', 'error');
        } else {
          throw error;
        }
        return;
      }

      if (data.user) {
        if ('Notification' in window && Notification.permission === 'granted') {
          subscribeToPushNotifications().catch(() => {});
        }
        // Guardar dados no localStorage para auto-preenchimento
        localStorage.setItem('saved_phone', formData.phone);
        localStorage.setItem('saved_dial_code', selectedCountry.dial_code);
        localStorage.setItem('saved_country_name', selectedCountry.name);

        // Exibir modal com confirmação de credenciais
        setGeneratedPasskey(userPasskey);
        setShowPasskeyDialog(true);
      }
    } catch (err: any) {
      let msg = err.message || 'Ops! Ocorreu um erro ao processar o cadastro.';
      if (msg.includes('email rate limit exceeded')) msg = 'Ops! Limite de tentativas excedido, tente mais tarde.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Passkey dialog actions
  const handlePasskeyDialogClose = () => {
    setShowPasskeyDialog(false);
    navigate('/login');
  };

  const handleCopyPasskey = async () => {
    try {
      await navigator.clipboard.writeText(generatedPasskey);
      setPasskeyDialogCopied(true);
      setTimeout(() => setPasskeyDialogCopied(false), 2500);
    } catch {
      showToast('Não foi possível copiar. Anote a senha manualmente.', 'error');
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
              <linearGradient id="tgOfficialGrad" x1=".667" x2=".417" y1=".167" y2=".75">
                <stop offset="0" stopColor="#37aee2"/>
                <stop offset="1" stopColor="#1e96c8"/>
              </linearGradient>
            </defs>
            <circle cx="120" cy="120" r="120" fill="url(#tgOfficialGrad)"/>
            <path fill="#c8daea" d="m98 175c-3.888 0-3.227-1.468-4.568-5.17l-11.433-37.594 88.022-52.232"/>
            <path fill="#a9c9dd" d="m98 175c3 0 4.325-1.372 6-3l16-15.558-19.958-12.035"/>
            <path fill="#fff" d="m100.04 144.41 48.36 35.729c5.519 3.045 9.501 1.468 10.876-5.123l19.685-92.763c2.015-8.08-3.08-11.746-8.36-9.349l-115.59 44.571c-7.89 3.165-7.843 7.567-1.438 9.528l29.663 9.259 68.673-43.325c3.242-1.966 6.218-.91 3.776 1.258"/>
          </svg>
        </div>

        {/* ── TÍTULO E SUBTÍTULO ── */}
        <h1 className="text-[26px] font-bold text-center mb-1.5 tracking-tight text-[#1c1c1e]">
          Telegram
        </h1>

        <p className="text-[13px] text-[#8e8e93] text-center mb-6 leading-snug max-w-[290px]">
          Confirme o código do seu país e introduza o seu número de telefone.
        </p>

        {/* ── FORMULÁRIO DE CADASTRO ── */}
        <form onSubmit={executeRegistration} className="w-full flex flex-col gap-4">

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
                value={formData.phone}
                onChange={handleChange}
                maxLength={selectedCountry.maxLength}
              />
            </div>

            {/* 2. Senha */}
            <div className="flex items-center px-1 h-[52px] border-b border-[#e5e5e5]">
              <input
                name="userPasskey"
                type={showUserPasskey ? 'text' : 'password'}
                placeholder="Por favor, insira a sua senha."
                className="flex-1 bg-transparent outline-none text-[15px] text-black placeholder:text-[#c7c7cc] font-normal"
                value={userPasskey}
                onChange={(e) => setUserPasskey(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowUserPasskey(v => !v)}
                className="ml-2 text-[#c7c7cc] hover:text-[#3390ec] active:opacity-50 transition-colors p-1 cursor-pointer shrink-0"
                aria-label={showUserPasskey ? 'Ocultar senha' : 'Ver senha'}
              >
                {showUserPasskey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* 3. Código de convite */}
            <div className="flex items-center px-1 h-[52px] border-b border-[#e5e5e5]">
              <input
                name="inviteCode"
                type="text"
                placeholder="Por favor, insira o código de convite."
                className="flex-1 bg-transparent outline-none text-[15px] text-black placeholder:text-[#c7c7cc] font-normal"
                value={formData.inviteCode}
                onChange={handleChange}
                maxLength={10}
              />
            </div>

            {/* 4. Verificação "Não sou um robô" */}
            <div
              onClick={() => setIsRobotVerified(prev => !prev)}
              className="flex items-center justify-between px-1 h-[52px] border-b border-[#e5e5e5] select-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={isRobotVerified}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-[#3390ec] accent-[#3390ec] cursor-pointer"
                />
                <span className="text-[14px] text-black font-normal">Não sou um robô</span>
              </div>
              <div className="flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Verificação</span>
              </div>
            </div>
          </div>

          {/* 5. BOTÕES DE AÇÃO */}
          <div className="w-full pt-1 space-y-2.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[48px] rounded-[12px] bg-[#3390ec] hover:bg-[#2881dc] active:scale-[0.98] text-white font-semibold text-[15px] transition-all disabled:opacity-50 flex items-center justify-center shadow-xs cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'Inscrever-se'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full text-center text-[#3390ec] hover:text-[#2881dc] font-medium text-[14.5px] transition-colors py-2 cursor-pointer hover:underline"
            >
              Já tenho conta — Conectar-se
            </button>
          </div>
        </form>
      </main>

      {/* ════════════════════════════════════════════════════════
          DIALOG — Chave de Acesso / Conta criada
      ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showPasskeyDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="bg-white w-full max-w-[340px] rounded-[24px] shadow-2xl p-6 flex flex-col items-center text-center"
            >
              {/* Lock icon */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#37aee2] to-[#1e96c8] flex items-center justify-center mb-4 shadow-md">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h3 className="text-[20px] font-bold text-black mb-1">Conta criada com sucesso!</h3>
              <p className="text-[13px] text-[#707579] leading-snug mb-4 max-w-[260px]">
                Esta é a sua senha de acesso. Guarde-a para entrar na sua conta.
              </p>

              {/* Passkey box + copy */}
              <div className="w-full bg-[#f0f7ff] border-2 border-[#3390ec] rounded-[18px] px-5 py-4 flex items-center justify-between mb-2">
                <span className="text-[24px] font-black text-[#3390ec] tracking-[4px] font-mono flex-1 text-center truncate">
                  {generatedPasskey}
                </span>
                <button
                  onClick={handleCopyPasskey}
                  className={`ml-2 p-2.5 rounded-[12px] transition-all active:scale-95 shrink-0 ${
                    passkeyDialogCopied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-[#3390ec]/10 text-[#3390ec] hover:bg-[#3390ec]/20'
                  }`}
                  title="Copiar senha"
                >
                  {passkeyDialogCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {passkeyDialogCopied && (
                <p className="text-[12px] text-green-600 font-semibold mb-2">✓ Copiado para a área de transferência!</p>
              )}

              <p className="text-[11px] text-[#a2acb4] mb-5 leading-snug">
                Número registrado:{' '}
                <strong className="text-[#707579]">
                  {selectedCountry.dial_code} {formData.phone}
                </strong>
              </p>

              <button
                onClick={handlePasskeyDialogClose}
                className="w-full h-[46px] rounded-[22px] bg-[#3390ec] hover:bg-[#2b7bc9] text-white font-semibold text-[14px] uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm"
              >
                ENTRAR NA MINHA CONTA
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <div className="p-8 text-center text-[#8e8e93]">Nenhum país encontrado</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
