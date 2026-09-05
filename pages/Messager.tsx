import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { getDeviceId } from '../lib/device';
import { subscribeToPushNotifications } from '../lib/pushNotifications';
import { Loader2, Search, X, Check, ArrowLeft, ChevronDown, Pencil } from 'lucide-react';
import { COUNTRIES, Country } from '../lib/countries';

export default function Messager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  // Step state: 'phone' | 'verification'
  const [step, setStep] = useState<'phone' | 'verification'>('phone');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [formData, setFormData] = useState({ phone: '', inviteCode: '' });
  const [verificationCode, setVerificationCode] = useState('');

  // Invite code URL & visibility states
  const [hasUrlInviteCode, setHasUrlInviteCode] = useState(false);
  const [showInviteInput, setShowInviteInput] = useState(false);

  // Monkey Animation States
  const [monkeyState, setMonkeyState] = useState<'idle' | 'shake'>('idle');
  const [headRotation, setHeadRotation] = useState(0);
  const [headX, setHeadX] = useState(0);
  const [pupilShift, setPupilShift] = useState(0);

  // Trigger head shake animation on error
  const triggerMonkeyShake = useCallback(() => {
    setMonkeyState('shake');
    setTimeout(() => {
      setMonkeyState('idle');
    }, 600);
  }, []);

  // Modal states
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [searchCountry, setSearchCountry] = useState('');

  // Automatic capture of invite code exclusively from ?join= URL parameter
  useEffect(() => {
    const code = searchParams.get('join');
    if (code) {
      const cleanCode = code.trim().slice(0, 4);
      setFormData(prev => ({ ...prev, inviteCode: cleanCode }));
      setHasUrlInviteCode(true);
    }
  }, [searchParams]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let sanitized = value;
    if (name === 'phone') {
      sanitized = value.replace(/\D/g, '').slice(0, selectedCountry.maxLength);
    } else if (name === 'inviteCode') {
      sanitized = value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
    } else {
      sanitized = value.trim();
    }
    setFormData(prev => ({ ...prev, [name]: sanitized }));
  }, [selectedCountry.maxLength]);

  // Handle head movement on verification code typing
  const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(val);

    if (val.length === 0) {
      setHeadRotation(0);
      setHeadX(0);
      setPupilShift(0);
    } else {
      const progress = val.length / 6;
      const angle = (progress - 0.5) * 32;
      const posX = (progress - 0.5) * 20;
      const pupil = (progress - 0.5) * 6;
      setHeadRotation(angle);
      setHeadX(posX);
      setPupilShift(pupil);
    }
  };

  // Handle head movement on invite code typing
  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
    setFormData(prev => ({ ...prev, inviteCode: val }));

    if (val.length === 0) {
      setHeadRotation(0);
      setHeadX(0);
      setPupilShift(0);
    } else {
      const progress = val.length / 4;
      const angle = (progress - 0.5) * 32;
      const posX = (progress - 0.5) * 20;
      const pupil = (progress - 0.5) * 6;
      setHeadRotation(angle);
      setHeadX(posX);
      setPupilShift(pupil);
    }
  };

  // Handle phone submission -> Trigger Confirmation Modal
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minLen = Math.max(6, selectedCountry.maxLength - 2);
    if (!formData.phone || formData.phone.length < minLen) {
      showToast(`Ops! Por favor insira um número de telefone válido (${selectedCountry.maxLength} dígitos).`, 'error');
      return;
    }
    setShowConfirmationModal(true);
  };

  // Confirm phone number -> Advance to Verification Screen
  const handleConfirmNumber = () => {
    setShowConfirmationModal(false);
    setStep('verification');
  };

  // Execute complete registration
  const executeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 4) {
      triggerMonkeyShake();
      showToast('Ops! Por favor introduza o código de verificação.', 'error');
      return;
    }

    // Check mandatory invite code
    if (!formData.inviteCode || formData.inviteCode.length !== 4) {
      setShowInviteInput(true);
      triggerMonkeyShake();
      showToast('Ops! Por favor introduza o código de convite (4 caracteres).', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: rpcData, error: vError } = await supabase.rpc('secure_registration_mcpn', {
        p_phone: formData.phone,
        p_invite_code: formData.inviteCode,
        p_device_id: getDeviceId()
      });

      if (vError) {
        setShowInviteInput(true);
        triggerMonkeyShake();
        throw vError;
      }

      const validation = rpcData as { success: boolean; message: string } | null;
      if (validation && !validation.success) {
        setShowInviteInput(true);
        triggerMonkeyShake();
        showToast(validation.message || 'Ops! Código de convite inválido ou expirado.', 'error');
        setIsSubmitting(false);
        return;
      }

      // Set user password to the verification code (Passkey / Chave de Acesso)
      const userPasskey = verificationCode;
      const { data, error } = await supabase.auth.signUp({
        email: `${formData.phone}@user.com`,
        password: userPasskey,
        options: {
          data: {
            phone: formData.phone,
            referred_by: formData.inviteCode,
            device_id: getDeviceId(),
            passkey: userPasskey
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
        showToast(data.session ? 'Tudo pronto! Cadastro concluído.' : 'Conta criada com sucesso! Faça login.', 'success');
        navigate(data.session ? '/home' : '/login');
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

  const filteredCountries = useMemo(() => {
    if (!searchCountry) return COUNTRIES;
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(searchCountry.toLowerCase()) || 
      c.dial_code.includes(searchCountry)
    );
  }, [searchCountry]);

  return (
    <div className="w-full min-h-screen bg-white pb-12 font-sans antialiased text-black select-none flex flex-col items-center justify-center p-4">
      {/* Top Header Back Button */}
      <div className="w-full max-w-[360px] flex items-center justify-between mb-2">
        {step === 'verification' ? (
          <button 
            onClick={() => setStep('phone')}
            className="flex items-center text-[#3390ec] font-medium text-[16px] hover:opacity-80 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Voltar
          </button>
        ) : (
          <div className="h-6"></div>
        )}
      </div>

      <main className="w-full max-w-[360px] flex flex-col items-center">
        {step === 'phone' ? (
          <>
            {/* Official Telegram Logo */}
            <div className="mb-6 flex items-center justify-center">
              <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" className="w-[120px] h-[120px]">
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

            <h1 className="text-[30px] font-semibold text-center mb-2 tracking-tight text-black">Telegram</h1>
            
            <p className="text-[15px] text-[#707579] text-center mb-8 leading-snug max-w-[320px]">
              Por favor, confirme o código do seu país e digite o seu número de telefone.
            </p>

            <form onSubmit={handlePhoneSubmit} className="w-full flex flex-col items-center">
              {/* Floating Label Input 1: Country */}
              <div 
                onClick={() => setShowCountryModal(true)}
                className="relative w-full h-[54px] rounded-[20px] border border-[#c8c7cc] hover:border-[#3390ec] focus-within:border-[#3390ec] px-4 flex items-center justify-between cursor-pointer transition-colors bg-white group mb-5"
              >
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-[12px] text-[#707579] font-medium pointer-events-none group-focus-within:text-[#3390ec]">
                  Country / País
                </label>
                <div className="flex items-center gap-2 overflow-hidden pr-2">
                  <img
                    src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                    alt={selectedCountry.name}
                    className="w-6 h-auto rounded-sm object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="text-[16px] text-black font-normal truncate">{selectedCountry.name}</span>
                </div>
                <ChevronDown className="w-5 h-5 text-[#a2acb4] group-hover:text-[#3390ec] transition-colors shrink-0" />
              </div>

              {/* Floating Label Input 2: Your Phone Number */}
              <div className="relative w-full h-[54px] rounded-[20px] border border-[#c8c7cc] focus-within:border-[#3390ec] px-4 flex items-center transition-colors bg-white group mb-5">
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-[12px] text-[#707579] font-medium pointer-events-none group-focus-within:text-[#3390ec]">
                  Your phone number / Número de telefone
                </label>
                <span className="text-[16px] text-black font-normal mr-2 select-none">
                  {selectedCountry.dial_code}
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder=""
                  className="flex-1 h-full bg-transparent outline-none text-[16px] text-black font-normal"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength={selectedCountry.maxLength}
                  autoFocus
                />
              </div>

              {/* Checkbox: Keep me signed in */}
              <label className="flex items-center gap-3 cursor-pointer select-none self-start mb-6">
                <input 
                  type="checkbox" 
                  checked={keepSignedIn} 
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-5 h-5 rounded-[4px] accent-[#3390ec] cursor-pointer"
                />
                <span className="text-[15px] text-[#000000] font-normal">Manter sessão iniciada</span>
              </label>

              <button
                type="submit"
                className="w-full h-[52px] rounded-[20px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-semibold text-[15px] uppercase tracking-wider transition-all shadow-sm flex items-center justify-center"
              >
                CONTINUAR
              </button>

              <div className="flex flex-col items-center gap-3 mt-8 w-full">
                <Link to="/login" className="text-[#3390ec] font-semibold text-[14px] uppercase tracking-wider hover:underline text-center">
                  LOG IN WITH PASSKEY
                </Link>
              </div>
            </form>
          </>
        ) : (
          /* STEP 2: OFFICIAL TELEGRAM VERIFICATION SCREEN DESIGN */
          <form onSubmit={executeRegistration} className="w-full flex flex-col items-center">
            {/* Cute Interactive Telegram Monkey SVG Animation */}
            <motion.div 
              className="mb-6 flex items-center justify-center"
              animate={
                monkeyState === 'shake'
                  ? {
                      x: [0, -18, 18, -14, 14, -10, 10, -5, 5, 0],
                      rotate: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0],
                    }
                  : {
                      x: headX,
                      rotate: headRotation,
                    }
              }
              transition={
                monkeyState === 'shake'
                  ? { duration: 0.5, ease: 'easeInOut' }
                  : { type: 'spring', stiffness: 260, damping: 20 }
              }
            >
              <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" className="w-[120px] h-[120px]">
                {/* Monkey ears */}
                <circle cx="28" cy="80" r="22" fill="#c49a6c" stroke="#5d4037" strokeWidth="4"/>
                <circle cx="28" cy="80" r="13" fill="#f8c8a0"/>
                <circle cx="132" cy="80" r="22" fill="#c49a6c" stroke="#5d4037" strokeWidth="4"/>
                <circle cx="132" cy="80" r="13" fill="#f8c8a0"/>
                {/* Head base */}
                <ellipse cx="80" cy="84" rx="54" ry="46" fill="#c49a6c" stroke="#5d4037" strokeWidth="4"/>
                {/* Inner light cream face shape */}
                <path d="M 40 86 C 40 58, 60 52, 80 66 C 100 52, 120 58, 120 86 C 120 114, 96 122, 80 122 C 64 122, 40 114, 40 86 Z" fill="#fce5cd" stroke="#5d4037" strokeWidth="3"/>
                
                {/* Eyes & Pupils with dynamic pupilShift */}
                <g>
                  {/* Left Eye */}
                  <ellipse cx="62" cy="82" rx="6.5" ry="9" fill="#212121"/>
                  <motion.circle 
                    animate={{ cx: 64 + pupilShift }} 
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    cy="79" r="2.5" fill="#ffffff"
                  />

                  {/* Right Eye */}
                  <ellipse cx="98" cy="82" rx="6.5" ry="9" fill="#212121"/>
                  <motion.circle 
                    animate={{ cx: 100 + pupilShift }} 
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    cy="79" r="2.5" fill="#ffffff"
                  />
                </g>

                {/* Nose */}
                <ellipse cx="80" cy="95" rx="7" ry="4.5" fill="#b08557"/>
                <circle cx="77.5" cy="95.5" r="1.8" fill="#5d4037"/>
                <circle cx="82.5" cy="95.5" r="1.8" fill="#5d4037"/>

                {/* Mouth expression */}
                {monkeyState === 'shake' ? (
                  <circle cx="80" cy="107" r="4.5" fill="#5d4037" />
                ) : (
                  <path d="M 72 104 Q 80 112 88 104" fill="none" stroke="#5d4037" strokeWidth="3.5" strokeLinecap="round"/>
                )}
              </svg>
            </motion.div>

            {/* Phone Number Display with Pencil Icon to Edit */}
            <div 
              className="flex items-center justify-center gap-2 mb-2 cursor-pointer group hover:opacity-80 transition-opacity"
              onClick={() => setStep('phone')}
              title="Clique para editar o número"
            >
              <h2 className="text-[28px] font-bold text-black tracking-tight">
                {selectedCountry.dial_code} {formData.phone.replace(/(\d{3})(?=\d)/g, '$1 ')}
              </h2>
              <Pencil className="w-5 h-5 text-[#707579] group-hover:text-[#3390ec] transition-colors shrink-0" />
            </div>

            <p className="text-[14px] text-[#707579] text-center mb-8 leading-snug max-w-[300px]">
              Enviámos o código de verificação para o seu número de telefone.
            </p>

            {/* Verification Code Floating Input Box */}
            <div className="relative w-full h-[54px] rounded-[20px] border border-[#c8c7cc] focus-within:border-[#3390ec] px-4 flex items-center transition-colors bg-white group mb-5">
              <label className="absolute -top-2.5 left-4 bg-white px-1 text-[12px] text-[#707579] font-medium pointer-events-none group-focus-within:text-[#3390ec] transition-colors">
                Code / Código
              </label>
              <input
                name="verificationCode"
                type="text"
                inputMode="numeric"
                placeholder=""
                maxLength={6}
                className="flex-1 h-full bg-transparent outline-none text-[18px] text-black font-medium tracking-widest text-center"
                value={verificationCode}
                onChange={handleVerificationCodeChange}
                onFocus={() => {
                  if (!verificationCode) {
                    setHeadRotation(-8);
                    setHeadX(-4);
                    setPupilShift(-2);
                  }
                }}
                autoFocus
              />
            </div>

            {/* MANDATORY Invite Code Floating Input Box (Shown if user clicks to introduce or if URL didn't have it on submit attempt) */}
            {showInviteInput ? (
              <div className="relative w-full h-[54px] rounded-[20px] border border-[#c8c7cc] focus-within:border-[#3390ec] px-4 flex items-center transition-colors bg-white group mb-6">
                <label className="absolute -top-2.5 left-4 bg-white px-1 text-[12px] text-[#707579] font-medium pointer-events-none group-focus-within:text-[#3390ec] transition-colors">
                  Invite Code / Código de Convite (4 caracteres) *
                </label>
                <input
                  name="inviteCode"
                  type="text"
                  placeholder="Ex: aB3c"
                  maxLength={4}
                  required
                  className="flex-1 h-full bg-transparent outline-none text-[16px] text-black font-mono tracking-widest uppercase text-center"
                  value={formData.inviteCode}
                  onChange={handleInviteCodeChange}
                  onFocus={() => {
                    if (!formData.inviteCode) {
                      setHeadRotation(8);
                      setHeadX(4);
                      setPupilShift(2);
                    }
                  }}
                  autoFocus
                />
              </div>
            ) : !hasUrlInviteCode ? (
              <button
                type="button"
                onClick={() => setShowInviteInput(true)}
                className="text-[#3390ec] font-semibold text-[14px] hover:underline mb-6 active:scale-95 transition-all text-center"
              >
                Possui um código de convite?
              </button>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[52px] rounded-[20px] bg-[#3390ec] hover:bg-[#2b7bc9] active:scale-[0.98] text-white font-semibold text-[15px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center shadow-sm"
            >
              {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 text-white" /> : 'CONCLUIR CADASTRO'}
            </button>
          </form>
        )}
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
                Voltar
              </button>
              <h2 className="flex-1 text-center text-[17px] font-semibold">Escolha um país</h2>
              <div className="w-[40px]"></div>
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

      {/* MODAL DE CONFIRMAÇÃO DO NÚMERO */}
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
              className="bg-white w-full max-w-[340px] rounded-[24px] overflow-hidden select-none font-sans antialiased shadow-xl p-6 flex flex-col items-center text-center"
            >
              <h2 className="text-[28px] font-bold text-black mb-2 tracking-tight">
                {selectedCountry.dial_code} {formData.phone.replace(/(\d{3})(?=\d)/g, '$1 ')}
              </h2>
              <p className="text-[16px] text-[#505050] font-normal mb-6">
                Este é o número correto?
              </p>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmationModal(false)}
                  className="flex-1 h-[40px] rounded-[20px] border border-[#3390ec] text-[#3390ec] font-semibold text-[15px] active:scale-[0.98] transition-all hover:bg-blue-50 flex items-center justify-center"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNumber}
                  className="flex-1 h-[40px] rounded-[20px] bg-[#3390ec] hover:bg-[#2b7bc9] text-white font-semibold text-[15px] active:scale-[0.98] transition-all shadow-sm flex items-center justify-center"
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
