import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import {
  Users,
  User,
  Phone,
  Radio,
  Bookmark,
  Settings,
  UserPlus,
  HelpCircle,
  Moon,
  Sun,
  ChevronDown,
  Star,
  Briefcase,
  Sparkles,
  ShieldCheck,
  X,
  Copy,
  Plus
} from 'lucide-react';

interface TelegramDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAutoMessages?: () => void;
}

export default function TelegramDrawer({ isOpen, onClose, onOpenAutoMessages }: TelegramDrawerProps) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user;
  const { showToast } = useToast();

  const [userName, setUserName] = useState('Utilizador Telegram');
  const [phone, setPhone] = useState('+244 9xx xxx xxx');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [balance, setBalance] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Modais auxiliares nativos
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Carrega dados do usuário
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata || {};
    const name = meta.name || meta.full_name || meta.first_name || 'Utilizador';
    setUserName(name);
    if (meta.avatar_url) setAvatarUrl(meta.avatar_url);

    (async () => {
      try {
        const { data } = await supabase.rpc('get_my_account_data');
        if (data && data.length > 0) {
          const d = data[0] as any;
          if (d.telefone) setPhone(d.telefone);
          if (d.nome_exibicao) setUserName(d.nome_exibicao);
          if (d.saldo_disponivel !== undefined) setBalance(Number(d.saldo_disponivel));
        }
      } catch {}
    })();

    // Checa tema inicial
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('tg_theme') === 'dark';
    setIsDarkMode(isDark);
  }, [user]);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tg_theme', 'dark');
      showToast('Modo Noturno ativado', 'info');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tg_theme', 'light');
      showToast('Modo Diurno ativado', 'info');
    }
  };

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleCopyInvite = () => {
    const inviteLink = `${window.location.origin}/messager?join=${user?.id?.slice(0, 8) || 'vip'}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      showToast('Link de convite oficial copiado!', 'success');
    }).catch(() => {
      showToast(inviteLink, 'info');
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-[300px] sm:w-[320px] max-w-[85vw] h-full bg-white dark:bg-[#17212b] shadow-2xl flex flex-col z-10 overflow-hidden select-none">
        {/* ── HEADER TELEGRAM NATIVO ── */}
        <div className="bg-[#517da2] dark:bg-[#242f3d] text-white pt-5 pb-3 px-4 flex flex-col justify-between transition-colors shadow-sm">
          <div className="flex items-center justify-between mb-4">
            {/* User Avatar */}
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={userName} 
                  className="w-14 h-14 rounded-full object-cover border-2 border-white/40 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#50a2e9] text-white flex items-center justify-center font-bold text-xl border-2 border-white/40 shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Online Dot */}
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#4fa6e8] border-2 border-white dark:border-[#242f3d] rounded-full" />
            </div>

            {/* Dark Mode Switcher */}
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-full bg-black/15 hover:bg-black/25 flex items-center justify-center text-white transition-colors cursor-pointer active:scale-95"
              title={isDarkMode ? "Mudar para Modo Diurno" : "Mudar para Modo Noturno"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* User Name & Phone with Dropdown */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[16.5px] leading-tight truncate text-white">
                  {userName}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#ffbe0b] text-black">
                  PRO
                </span>
              </div>
              <span className="text-[13px] text-white/80 font-normal tracking-wide block truncate mt-0.5">
                {phone}
              </span>
            </div>

            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white rounded-full transition-transform"
              style={{ transform: showAccountMenu ? 'rotate(180deg)' : 'none' }}
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Account Sub-menu */}
          {showAccountMenu && (
            <div className="mt-3 pt-3 border-t border-white/15 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-white/90 font-medium">Conta Ativa</span>
                <span className="text-white/80">{balance.toLocaleString()} Stars</span>
              </div>
              <button 
                onClick={() => handleNavigate('/perfil')}
                className="flex items-center gap-2 text-[13px] text-white/95 hover:text-white pt-1"
              >
                <Plus className="w-4 h-4" /> Adicionar outra conta
              </button>
            </div>
          )}
        </div>

        {/* ── LISTA DE ITENS DO MENU TELEGRAM ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2 text-[#222222] dark:text-[#f5f5f5]">
          {/* Novo Grupo */}
          <DrawerItem 
            icon={<Users className="w-5 h-5 text-[#707579] dark:text-[#a0aab5]" />}
            label="Novo Grupo"
            onClick={() => setActiveModal('new_group')}
          />

          {/* Contatos */}
          <DrawerItem 
            icon={<User className="w-5 h-5 text-[#707579] dark:text-[#a0aab5]" />}
            label="Contatos"
            onClick={() => handleNavigate('/convite')}
          />

          {/* Chamadas */}
          <DrawerItem 
            icon={<Phone className="w-5 h-5 text-[#707579] dark:text-[#a0aab5]" />}
            label="Chamadas"
            onClick={() => setActiveModal('calls')}
          />

          {/* Pessoas Próximas */}
          <DrawerItem 
            icon={<Radio className="w-5 h-5 text-[#707579] dark:text-[#a0aab5]" />}
            label="Pessoas Próximas"
            onClick={() => setActiveModal('nearby')}
          />

          {/* Mensagens Salvas */}
          <DrawerItem 
            icon={<Bookmark className="w-5 h-5 text-[#707579] dark:text-[#a0aab5]" />}
            label="Mensagens Salvas"
            onClick={() => setActiveModal('saved_messages')}
          />

          {/* Configurações */}
          <DrawerItem 
            icon={<Settings className="w-5 h-5 text-[#707579] dark:text-[#a0aab5]" />}
            label="Configurações"
            onClick={() => handleNavigate('/perfil')}
          />

          <div className="my-1 border-t border-gray-100 dark:border-[#202b36]" />

          {/* Telegram Business - Mensagens Automáticas */}
          <DrawerItem 
            icon={<Briefcase className="w-5 h-5 text-[#2481cc]" />}
            label="Telegram Business"
            badge="NOVO"
            badgeColor="bg-[#2481cc] text-white"
            onClick={() => {
              onClose();
              if (onOpenAutoMessages) onOpenAutoMessages();
              else navigate('/perfil');
            }}
          />

          {/* Telegram Premium */}
          <DrawerItem 
            icon={<Sparkles className="w-5 h-5 text-[#8d54d9]" />}
            label="Telegram Premium"
            badge="VIP"
            badgeColor="bg-[#8d54d9] text-white"
            onClick={() => handleNavigate('/telegram-premium')}
          />

          {/* Telegram Stars */}
          <DrawerItem 
            icon={<Star className="w-5 h-5 text-[#f5a623] fill-[#f5a623]" />}
            label="Telegram Stars"
            badge={`${balance.toLocaleString()} ⭐`}
            badgeColor="bg-[#fff3cd] dark:bg-[#3d3319] text-[#b78103] dark:text-[#ffd166]"
            onClick={() => handleNavigate('/stars')}
          />

          <div className="my-1 border-t border-gray-100 dark:border-[#202b36]" />

          {/* Convidar Amigos */}
          <DrawerItem 
            icon={<UserPlus className="w-5 h-5 text-[#707579] dark:text-[#a0aab5]" />}
            label="Convidar Amigos"
            onClick={handleCopyInvite}
          />

          {/* Recursos do Telegram */}
          <DrawerItem 
            icon={<HelpCircle className="w-5 h-5 text-[#707579] dark:text-[#a0aab5]" />}
            label="Recursos do Telegram"
            onClick={() => handleNavigate('/help-faq')}
          />
        </div>

        {/* ── FOOTER TELEGRAM ── */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-[#121921] border-t border-gray-100 dark:border-[#202b36] flex items-center justify-between text-[11px] text-[#707579] dark:text-[#7e8b99]">
          <span>Telegram for Android</span>
          <span>v10.14.2</span>
        </div>
      </div>

      {/* ── MODAIS INTERATIVOS NATIVOS ── */}
      {/* 1. Modal Novo Grupo */}
      {activeModal === 'new_group' && (
        <NativeTelegramModal
          title="Novo Grupo"
          onClose={() => setActiveModal(null)}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#50a2e9] text-white flex items-center justify-center shadow-xs">
                <Users className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-[#707579] uppercase font-semibold">Nome do Grupo</label>
                <input 
                  type="text" 
                  placeholder="Introduza o nome do grupo..."
                  defaultValue="Comunidade VIP Telegram"
                  className="w-full text-[15px] outline-none border-b border-[#2481cc] py-1 bg-transparent dark:text-white"
                />
              </div>
            </div>
            <p className="text-[13px] text-[#707579] dark:text-[#9eaab6]">
              Até 200 000 membros, histórico persistente, links públicos e permissões avançadas de administradores.
            </p>
            <div className="pt-2 flex justify-end gap-2">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm text-[#707579] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  showToast('Grupo criado com sucesso!', 'success');
                  setActiveModal(null);
                  handleNavigate('/chat-comunidade');
                }}
                className="px-4 py-2 text-sm bg-[#2481cc] text-white font-medium rounded-lg shadow-sm"
              >
                Criar Grupo
              </button>
            </div>
          </div>
        </NativeTelegramModal>
      )}

      {/* 2. Modal Chamadas */}
      {activeModal === 'calls' && (
        <NativeTelegramModal
          title="Chamadas Recentes"
          onClose={() => setActiveModal(null)}
        >
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3390ec] text-white flex items-center justify-center font-bold">
                  PD
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold dark:text-white">Pavel Durov (Oficial)</h4>
                  <span className="text-[12px] text-emerald-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Recebida • Ontem 18:32
                  </span>
                </div>
              </div>
              <button 
                onClick={() => showToast('Iniciando chamada com Pavel Durov...', 'info')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[#2481cc]"
              >
                <Phone className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#50a2e9] text-white flex items-center justify-center font-bold">
                  TB
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold dark:text-white">Suporte Telegram Business</h4>
                  <span className="text-[12px] text-blue-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Efetuada • 02 Set 11:15
                  </span>
                </div>
              </div>
              <button 
                onClick={() => showToast('Chamando Suporte Telegram...', 'info')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[#2481cc]"
              >
                <Phone className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-[12px] text-center text-[#707579] pt-2">
              🔒 Todas as chamadas de voz e vídeo do Telegram são criptografadas de ponta a ponta.
            </p>
          </div>
        </NativeTelegramModal>
      )}

      {/* 3. Modal Pessoas Próximas */}
      {activeModal === 'nearby' && (
        <NativeTelegramModal
          title="Pessoas Próximas"
          onClose={() => setActiveModal(null)}
        >
          <div className="p-5 flex flex-col items-center text-center space-y-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#2481cc]/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-[#2481cc]/30" />
              <div className="w-14 h-14 rounded-full bg-[#2481cc] text-white flex items-center justify-center shadow-md z-10">
                <Radio className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h3 className="text-[16px] font-bold dark:text-white">Procurando Usuários Próximos</h3>
              <p className="text-[13px] text-[#707579] dark:text-[#9eaab6] mt-1">
                Troque contatos e descubra grupos locais em Luanda e arredores.
              </p>
            </div>
            <div className="w-full bg-gray-50 dark:bg-[#202b36] rounded-xl p-3 text-left space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium dark:text-white">Grupo Empreendedores Luanda</span>
                <span className="text-xs text-[#2481cc]">500 metros</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium dark:text-white">Telegram Business Angola</span>
                <span className="text-xs text-[#2481cc]">1.2 km</span>
              </div>
            </div>
            <button
              onClick={() => {
                showToast('Visibilidade ativada nas redondezas!', 'success');
                setActiveModal(null);
              }}
              className="w-full py-2.5 bg-[#2481cc] text-white rounded-lg font-medium shadow-sm"
            >
              Tornar-se Visível
            </button>
          </div>
        </NativeTelegramModal>
      )}

      {/* 4. Modal Mensagens Salvas */}
      {activeModal === 'saved_messages' && (
        <NativeTelegramModal
          title="Mensagens Salvas"
          onClose={() => setActiveModal(null)}
        >
          <div className="p-4 flex flex-col space-y-3">
            <div className="bg-[#effdde] dark:bg-[#2b5278] p-3 rounded-2xl rounded-tr-xs text-[14px] self-end max-w-[85%] shadow-2xs">
              <p className="dark:text-white">📌 Armazenamento em nuvem pessoal ilimitado. Guarde links, mídias e lembretes aqui.</p>
              <span className="text-[10px] text-gray-500 dark:text-gray-300 block text-right mt-1">Hoje 14:00 ✓✓</span>
            </div>
            <div className="bg-[#effdde] dark:bg-[#2b5278] p-3 rounded-2xl rounded-tr-xs text-[14px] self-end max-w-[85%] shadow-2xs">
              <p className="dark:text-white">⭐ Código de convite: {user?.id?.slice(0, 8) || 'VIP2026'}</p>
              <span className="text-[10px] text-gray-500 dark:text-gray-300 block text-right mt-1">Hoje 14:02 ✓✓</span>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <input 
                type="text" 
                placeholder="Escreva uma nota na nuvem..." 
                className="flex-1 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl text-sm outline-none dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    showToast('Nota salva na sua nuvem pessoal!', 'success');
                    (e.target as any).value = '';
                  }
                }}
              />
              <button 
                onClick={() => showToast('Nota salva na sua nuvem pessoal!', 'success')}
                className="px-3 py-2 bg-[#2481cc] text-white rounded-xl text-xs font-semibold"
              >
                Salvar
              </button>
            </div>
          </div>
        </NativeTelegramModal>
      )}
    </div>
  );
}

function DrawerItem({
  icon,
  label,
  badge,
  badgeColor,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100/80 dark:hover:bg-[#202b36] transition-colors cursor-pointer text-left group"
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0">{icon}</div>
        <span className="text-[14.5px] font-medium tracking-tight text-[#222222] dark:text-[#f0f2f5]">
          {label}
        </span>
      </div>
      {badge && (
        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full leading-tight ${badgeColor || 'bg-gray-200 text-gray-700'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function NativeTelegramModal({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-[360px] bg-white dark:bg-[#17212b] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-4 py-3.5 bg-[#517da2] dark:bg-[#242f3d] text-white flex items-center justify-between">
          <h3 className="font-semibold text-[16px]">{title}</h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
