import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  QrCode,
  MoreVertical,
  Wallet,
  PlusCircle,
  Settings as SettingsIcon,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  Volume2,
  Building2,
  MessagesSquare,
  Smartphone,
  Globe,
  ChevronRight,
  Star,
  Store,
  Gift,
  HelpCircle,
  Lightbulb,
  Lock,
  LogOut,
  Camera,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatCurrency } from "../../lib/currency";
import { useToast } from "../../components/Toast";
import EditProfileModal from "./components/EditProfileModal";

export default function Profile() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const settingsSectionRef = useRef<HTMLDivElement>(null);

  const [showLanguage, setShowLanguage] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [balance, setBalance] = useState<number>(15000);
  const [dailyIncome, setDailyIncome] = useState<number>(500);
  const [totalDeposits, setTotalDeposits] = useState<number>(20000);
  const [totalWithdrawals, setTotalWithdrawals] = useState<number>(5000);
  const [phone, setPhone] = useState<string>("+244 941465064");
  const [userName, setUserName] = useState<string>("Thomas Hall");
  const [firstName, setFirstName] = useState<string>("Thomas");
  const [lastName, setLastName] = useState<string>("Hall");
  const [userBio, setUserBio] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>(
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop"
  );

  // Fetch real account stats from Supabase
  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        const fName = meta.first_name || (meta.name || meta.full_name || "Thomas").split(" ")[0];
        const lName = meta.last_name || (meta.name || meta.full_name || "").split(" ").slice(1).join(" ");
        const fullName = [fName, lName].filter(Boolean).join(" ");
        setFirstName(fName);
        setLastName(lName);
        setUserName(fullName || "Thomas Hall");
        if (meta.bio) setUserBio(meta.bio);
        if (meta.avatar_url) setAvatarUrl(meta.avatar_url);
        if (user.phone) setPhone(user.phone);
        else if (meta.phone) setPhone(meta.phone);
      }

      const { data, error } = await supabase.rpc("get_my_account_data");
      if (!error && data && data.length > 0) {
        const d = data[0] as any;
        if (d.saldo_disponivel !== undefined) setBalance(Number(d.saldo_disponivel));
        else if (d.balance !== undefined) setBalance(Number(d.balance));
        
        if (d.total_recarregado !== undefined) setTotalDeposits(Number(d.total_recarregado));
        else if (d.total_recharge !== undefined) setTotalDeposits(Number(d.total_recharge));
        
        if (d.total_retirado !== undefined) setTotalWithdrawals(Number(d.total_retirado));
        else if (d.total_withdraw !== undefined) setTotalWithdrawals(Number(d.total_withdraw));
        
        if (d.lucro_acumulado !== undefined) setDailyIncome(Number(d.lucro_acumulado));
        else if (d.daily_earnings !== undefined) setDailyIncome(Number(d.daily_earnings));
        
        if (d.telefone) setPhone(d.telefone);
        else if (d.phone) setPhone(d.phone);
      }
    } catch {
      // Keep elegant default display values
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const scrollToSettings = () => {
    settingsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      showToast("Sessão terminada com sucesso", "success");
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f1f1f2] font-sans text-black pb-28">

      {/* HEADER */}
      <header className="w-full max-w-2xl mx-auto px-4 pt-4 pb-2 flex justify-between items-center relative z-10">
        <button className="p-1 rounded-full active:opacity-50 transition-opacity" aria-label="QR Code">
          <QrCode className="w-6 h-6 text-black" strokeWidth={2} />
        </button>
        <button className="p-1 rounded-full active:opacity-50 transition-opacity" aria-label="Mais opções">
          <MoreVertical className="w-6 h-6 text-black" strokeWidth={2.5} />
        </button>
      </header>

      {/* AVATAR & NAME */}
      <section className="flex flex-col items-center mt-1 mb-5 px-4 max-w-2xl mx-auto">
        <div className="relative mb-3 cursor-pointer" onClick={() => setShowEditProfile(true)}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-[96px] h-[96px] rounded-full object-cover shadow-sm ring-4 ring-white"
            />
          ) : (
            <div className="w-[96px] h-[96px] rounded-full bg-gradient-to-br from-[#3390ec] to-[#1e6dc8] flex items-center justify-center shadow-sm ring-4 ring-white">
              <span className="text-[38px] font-bold text-white">{firstName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setShowEditProfile(true); }}
            className="absolute bottom-0 right-0 w-[28px] h-[28px] bg-[#25D366] rounded-full flex items-center justify-center border-2 border-white shadow-xs active:scale-90 transition-transform"
            aria-label="Editar perfil"
          >
            <Camera className="w-[13px] h-[13px] text-white fill-white" />
          </button>
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-black mb-0.5">{userName}</h1>
        {userBio ? (
          <p className="text-[13px] text-[#8e8e93] text-center max-w-[240px] mb-0.5">{userBio}</p>
        ) : null}
        <p className="text-[14px] text-[#8e8e93] font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#25D366] inline-block"></span>
          online
        </p>
      </section>

      <main className="px-3 flex flex-col gap-3.5 max-w-2xl mx-auto">

        {/* 3 BOTÕES DE AÇÃO RÁPIDA */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          <button
            onClick={() => navigate("/retirada")}
            className="bg-white rounded-[16px] py-3.5 px-2 flex flex-col items-center justify-center gap-1 shadow-2xs border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Wallet className="w-[22px] h-[22px] text-black" strokeWidth={1.8} />
            <span className="text-[12px] font-semibold text-black leading-tight text-center">Resgatar Estrelas</span>
          </button>
          <button
            onClick={() => navigate("/recarregar")}
            className="bg-white rounded-[16px] py-3.5 px-2 flex flex-col items-center justify-center gap-1 shadow-2xs border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle className="w-[22px] h-[22px] text-black" strokeWidth={1.8} />
            <span className="text-[12px] font-semibold text-black leading-tight text-center">Obter Estrelas</span>
          </button>
          <button
            onClick={scrollToSettings}
            className="bg-white rounded-[16px] py-3.5 px-2 flex flex-col items-center justify-center gap-1 shadow-2xs border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <SettingsIcon className="w-[22px] h-[22px] text-black" strokeWidth={1.8} />
            <span className="text-[12px] font-semibold text-black leading-tight text-center">Settings</span>
          </button>
        </div>

        {/* CARD INFORMAÇÕES & DASHBOARD DE ESTRELAS */}
        <div className="bg-white rounded-[18px] p-4 flex flex-col gap-4 shadow-2xs border border-gray-100">
          <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="text-[16px] text-black font-semibold leading-tight mb-0.5">{phone}</div>
              <div className="text-[13px] text-[#8e8e93]">Celular</div>
            </div>
            <div className="flex items-center gap-1 bg-[#fff8ec] px-2.5 py-1 rounded-full border border-[#fef3c7]">
              <Star className="w-3.5 h-3.5 text-[#f59e0b] fill-[#f59e0b]" />
              <span className="text-[12px] font-bold text-[#b45309]">Stars VIP</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 w-full">
            <div className="text-left">
              <div className="text-[13px] text-[#8e8e93] mb-0.5 flex items-center gap-1">
                <span>Saldo de Estrelas</span>
                <Star className="w-3 h-3 text-[#f59e0b] fill-[#f59e0b]" />
              </div>
              <div className="text-[16px] text-[#25D366] font-bold">{formatCurrency(balance, "KZ")}</div>
            </div>
            <div className="text-right">
              <div className="text-[13px] text-[#8e8e93] mb-0.5">Estrelas Diárias</div>
              <div className="text-[16px] text-black font-semibold">+{formatCurrency(dailyIncome, "KZ")}</div>
            </div>
            <div className="text-left">
              <div className="text-[13px] text-[#8e8e93] mb-0.5">Total Adquirido</div>
              <div className="text-[16px] text-black font-semibold">{formatCurrency(totalDeposits, "KZ")}</div>
            </div>
            <div className="text-right">
              <div className="text-[13px] text-[#8e8e93] mb-0.5">Total Resgatado</div>
              <div className="text-[16px] text-black font-semibold">{formatCurrency(totalWithdrawals, "KZ")}</div>
            </div>
          </div>
        </div>

        {/* ═══ SEÇÃO DE SETTINGS UNIFICADA ═══ */}
        <div ref={settingsSectionRef} className="flex flex-col gap-3.5 pt-1">

          {/* CARD 1: CONTA & PREFERÊNCIAS */}
          <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
            <SettingsItem
              icon={<CreditCard className="w-5 h-5 text-white" />}
              iconBg="bg-[#3390ec]"
              title="Conta"
              subtitle="Adicionar cartão bancário"
              onClick={() => navigate("/adicionar-banco")}
            />

            <SettingsItem
              icon={<MessageSquare className="w-5 h-5 text-white" />}
              iconBg="bg-[#f2a93b]"
              title="Chat Settings"
              subtitle="Wallpaper, Night Mode, Animations"
              onClick={() => navigate("/telegramBussiness")}
            />

            <SettingsItem
              icon={<ShieldAlert className="w-5 h-5 text-white" />}
              iconBg="bg-[#25D366]"
              title="Redefinir Senha de Segurança"
              subtitle="Altere a sua senha de acesso"
              onClick={() => navigate("/alterar-senha")}
            />

            <SettingsItem
              icon={<Volume2 className="w-5 h-5 text-white fill-white" />}
              iconBg="bg-[#fe384f]"
              title="Notifications"
              subtitle="Sounds, Calls, Badges"
              onClick={() => {
                if ("Notification" in window) {
                  Notification.requestPermission();
                  showToast("Configuração de notificações atualizada", "info");
                }
              }}
            />

            <SettingsItem
              icon={<Building2 className="w-5 h-5 text-white" />}
              iconBg="bg-[#3390ec]"
              title="Informações Bancárias"
              subtitle="Ver conta bancária adicionada"
              onClick={() => navigate("/informacao-bancaria")}
            />

            <SettingsItem
              icon={<MessagesSquare className="w-5 h-5 text-white" />}
              iconBg="bg-[#3390ec]"
              title="Pastas de Chat"
              subtitle="Aceder ao chat da comunidade"
              onClick={() => navigate("/telegramBussiness")}
            />

            <SettingsItem
              icon={<Smartphone className="w-5 h-5 text-white" />}
              iconBg="bg-[#46c2ca]"
              title="Termos de uso e privacidade"
              subtitle="Ver versão e actualizar a aplicação"
              onClick={() => navigate("/devices")}
            />

            <SettingsItem
              icon={<Globe className="w-5 h-5 text-white" />}
              iconBg="bg-[#b375d6]"
              title="Idioma"
              subtitle="Português (Brasil)"
              isLast={true}
              onClick={() => setShowLanguage(true)}
            />
          </div>

          {/* CARD 2: PRODUTOS & RECURSOS */}
          <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
            <SettingsItem
              icon={<Star className="w-5 h-5 text-white fill-white" />}
              iconBg="bg-[#8d54d9]"
              title="Telegram Premium"
              subtitle="Sistema de convites e benefícios de afiliados"
              onClick={() => navigate("/telegram-premium")}
            />

            <SettingsItem
              icon={<Star className="w-5 h-5 text-white fill-white" />}
              iconBg="bg-[#f2a93b]"
              title="Telegram Stars"
              subtitle="Saldo, pacotes e conversão de estrelas"
              onClick={() => navigate("/stars")}
            />

            <SettingsItem
              icon={<Store className="w-5 h-5 text-white" />}
              iconBg="bg-[#e95171]"
              title="Telegram Business"
              subtitle="Página comercial e ferramentas"
              onClick={() => navigate("/bot-pay")}
            />

            <SettingsItem
              icon={<Gift className="w-5 h-5 text-white" />}
              iconBg="bg-[#f2a93b]"
              title="Send a Gift"
              subtitle="Oferecer estrelas a amigos"
              isLast={true}
              onClick={() => navigate("/bot-pay")}
            />
          </div>

          {/* CARD 3: AJUDA & SUPORTE */}
          <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
            <div className="px-4 py-2 pt-3">
              <span className="text-[13px] font-semibold text-[#00a884] tracking-wide">Ajuda</span>
            </div>

            <SettingsItem
              icon={<MessageSquare className="w-5 h-5 text-white" />}
              iconBg="bg-[#f2a93b]"
              title="Fazer uma Pergunta"
              subtitle="Fale com o suporte no Telegram"
              onClick={() => navigate("/telegramBussiness")}
            />

            <SettingsItem
              icon={<HelpCircle className="w-5 h-5 text-white" />}
              iconBg="bg-[#3390ec]"
              title="Perguntas Frequentes"
              subtitle="Tire as suas dúvidas"
              onClick={() => navigate("/help-faq")}
            />

            <SettingsItem
              icon={<Lightbulb className="w-5 h-5 text-white fill-white" />}
              iconBg="bg-[#b375d6]"
              title="Recursos do Telegram"
              subtitle="Descubra novas funcionalidades"
              isLast={true}
              onClick={() => navigate("/sobre-telegram business")}
            />
          </div>

          {/* CARD 4: LOGOUT */}
          <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3.5 text-left hover:bg-red-50/50 active:bg-red-50 transition-colors cursor-pointer"
            >
              <div className="w-[32px] h-[32px] rounded-[10px] bg-red-500 flex items-center justify-center shrink-0 mr-4">
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <span className="text-[15px] font-semibold text-red-600">Sair da Conta</span>
            </button>
          </div>

        </div>

      </main>

      {/* MODAL DE IDIOMA */}
      {showLanguage && (
        <div className="fixed inset-0 z-50 bg-[#f1f1f2] overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {/* Header do Modal */}
            <div className="flex items-center px-4 pt-5 pb-3 bg-[#f1f1f2] sticky top-0 z-10 border-b border-gray-200/60">
              <button onClick={() => setShowLanguage(false)} className="mr-3 p-1 rounded-full active:opacity-50">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M5 12l7-7M5 12l7 7" />
                </svg>
              </button>
              <span className="text-[18px] font-bold flex-1">Idioma</span>
            </div>

            <div className="px-3 flex flex-col gap-4 pb-12 pt-3">
              {/* Traduzir Mensagens Card */}
              <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[13px] font-semibold text-[#25D366]">Traduzir Mensagens</span>
                </div>
                <TranslateRow label="Mostrar o Botão Traduzir" defaultOn={true} />
                <TranslateRow label="Traduzir Chats Inteiros" locked={true} />
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] text-black">Não Traduzir</span>
                  <span className="text-[13px] font-medium text-[#25D366]">3 Idiomas</span>
                </div>
              </div>

              {/* Lista de Idiomas */}
              <div className="bg-white rounded-[18px] overflow-hidden shadow-2xs border border-gray-100">
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[13px] font-semibold text-[#25D366]">Idioma do Aplicativo</span>
                </div>
                <LangRow label="Português (Brasil)" sub="Portuguese (Brazil)" code="pt" available />
                <LangRow label="English" sub="English" code="en" available />
                <LangRow label="Français" sub="French" code="fr" available />
                <LangRow label="العربية" sub="Arabic" code="ar" />
                <LangRow label="简体中文" sub="Chinese (Simplified)" code="zh-hans" />
                <LangRow label="Español" sub="Spanish" code="es" isLast />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PERFIL */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        initialData={{ firstName, lastName, bio: userBio, avatarUrl, phone }}
        onSaved={({ firstName: fn, lastName: ln, bio: b, avatarUrl: av }) => {
          setFirstName(fn);
          setLastName(ln);
          setUserName([fn, ln].filter(Boolean).join(" "));
          setUserBio(b);
          setAvatarUrl(av);
        }}
      />

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTES AUXILIARES
══════════════════════════════════════════════════════════════ */
function SettingsItem({
  icon,
  iconBg,
  title,
  subtitle,
  isLast = false,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  isLast?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className="flex items-center px-4 py-3 hover:bg-gray-50/80 active:bg-gray-100 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className={`w-[32px] h-[32px] rounded-[10px] ${iconBg} flex items-center justify-center shrink-0 mr-3.5 shadow-2xs`}>
        {icon}
      </div>
      <div className={`flex-1 flex flex-col justify-center py-0.5 ${!isLast ? "border-b border-gray-100" : ""}`}>
        <span className="text-[15px] font-medium text-black leading-tight mb-0.5">{title}</span>
        {subtitle && (
          <span className="text-[12.5px] font-normal text-[#8e8e93] leading-tight truncate">
            {subtitle}
          </span>
        )}
      </div>
      {onClick && <ChevronRight className="w-4 h-4 text-[#c7c7cc] shrink-0 ml-2" />}
    </div>
  );
}

function TranslateRow({
  label,
  defaultOn = false,
  locked = false,
}: {
  label: string;
  defaultOn?: boolean;
  locked?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
      <span className="text-[15px] text-black">{label}</span>
      {locked ? (
        <div className="w-[44px] h-[26px] rounded-full bg-gray-200 flex items-center justify-center relative">
          <div className="w-[22px] h-[22px] bg-white rounded-full shadow flex items-center justify-center absolute left-0.5">
            <Lock className="w-3 h-3 text-gray-400" />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOn(!on)}
          className={`w-[44px] h-[26px] rounded-full transition-colors relative cursor-pointer ${
            on ? "bg-[#25D366]" : "bg-gray-300"
          }`}
        >
          <div
            className={`w-[22px] h-[22px] bg-white rounded-full shadow absolute top-0.5 transition-all ${
              on ? "left-[20px]" : "left-0.5"
            }`}
          />
        </button>
      )}
    </div>
  );
}

function LangRow({
  label,
  sub,
  code,
  available = false,
  isLast = false,
}: {
  label: string;
  sub: string;
  code: string;
  available?: boolean;
  isLast?: boolean;
}) {
  const { language, setLanguage } = useLanguage();
  const isSelected = language === code;
  const handleClick = () => {
    if (available) setLanguage(code as any);
  };
  return (
    <div
      className={`flex items-center px-4 py-3 ${
        !isLast ? "border-b border-[#e5e5e5]" : ""
      } ${available ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100" : "opacity-60 cursor-default"}`}
      onClick={handleClick}
    >
      <div
        className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center mr-3.5 shrink-0 ${
          isSelected ? "border-[#25D366]" : "border-gray-300"
        }`}
      >
        {isSelected && <div className="w-[10px] h-[10px] rounded-full bg-[#25D366]" />}
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-[15px] font-medium text-black leading-tight">{label}</span>
        <span className="text-[12.5px] text-[#8e8e93]">{sub}</span>
      </div>
    </div>
  );
}
