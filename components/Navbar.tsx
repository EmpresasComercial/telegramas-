import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, Bot, Settings, Edit3 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      name: 'Chats',
      path: '/telegramBussiness',
      aliasPaths: ['/telegramBussiness', '/telegramBusiness', '/telegram-business', '/home'],
      icon: <MessageSquare className="w-[22px] h-[22px]" strokeWidth={2} />,
      badge: 3
    },
    {
      name: 'Contatos',
      path: '/convite',
      aliasPaths: ['/convite'],
      icon: <Users className="w-[22px] h-[22px]" strokeWidth={2} />
    },
    {
      name: 'Bots & Pay',
      path: '/bot-pay',
      aliasPaths: ['/bot-pay', '/operacoes'],
      icon: <Bot className="w-[22px] h-[22px]" strokeWidth={2} />
    },
    {
      name: 'Definições',
      path: '/perfil',
      aliasPaths: ['/perfil', '/settings', '/configuracoes-conta'],
      icon: <Settings className="w-[22px] h-[22px]" strokeWidth={2} />
    }
  ];

  // Mostra o botão flutuante de lápis (FAB Telegram) na lista de chats ou tela inicial
  const showFab = ['/telegramBussiness', '/telegramBusiness', '/telegram-business', '/home'].includes(location.pathname);

  return (
    <>
      {/* ── BOTÃO DE AÇÃO FLUTUANTE OFICIAL DO TELEGRAM (FAB LÁPIS) ── */}
      {showFab && (
        <button
          onClick={() => navigate('/chat-comunidade')}
          className="fixed bottom-[72px] right-4 sm:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-[#1e96c8] to-[#50a2e9] text-white flex items-center justify-center shadow-[0_4px_16px_rgba(36,129,204,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Nova Mensagem"
          aria-label="Nova Mensagem"
        >
          <Edit3 className="w-6 h-6 stroke-[2.2]" />
        </button>
      )}

      {/* ── BARRA DE NAVEGAÇÃO INFERIOR OFICIAL DO TELEGRAM (TRANSPARENTE FULL-WIDTH) ── */}
      <nav className="fixed bottom-0 left-0 right-0 w-full z-50 h-[58px] bg-transparent backdrop-blur-md border-t border-black/5 dark:border-white/10 flex items-center justify-around px-4 select-none">
        {navItems.map((item) => {
          const isActive = item.aliasPaths.some(p => location.pathname === p || (p !== '/home' && location.pathname.startsWith(p)));

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center h-full transition-colors cursor-pointer group",
                isActive
                  ? "text-[#2481cc] dark:text-[#5288c1]"
                  : "text-[#707579] dark:text-[#8e9aa5] hover:text-[#2481cc]"
              )}
            >
              <div className="relative flex items-center justify-center">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-[#2481cc] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium tracking-tight mt-0.5",
                isActive ? "font-bold" : ""
              )}>
                {item.name}
              </span>

              {/* Indicador sutil de aba ativa */}
              {isActive && (
                <div className="absolute top-0 w-8 h-[2px] bg-[#2481cc] rounded-full" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
