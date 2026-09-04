import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import TelegramDrawer from './TelegramDrawer';
import AutoMessagesModal from './AutoMessagesModal';

export default function Layout() {
  const location = useLocation();

  // Rotas onde a barra de navegação inferior oficial do Telegram deve ser exibida
  const mainTabPaths = [
    '/home',
    '/telegramBussiness',
    '/telegramBusiness',
    '/telegram-business',
    '/convite',
    '/bot-pay',
    '/perfil',
    '/settings',
    '/configuracoes-conta'
  ];

  const isChatRoom = location.pathname.startsWith('/chat/') || 
                     location.pathname === '/chat-comunidade' || 
                     location.pathname === '/comunidade-chat';

  const showNavbar = !isChatRoom && (
    mainTabPaths.includes(location.pathname) || 
    location.pathname.startsWith('/bot-pay')
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAutoMessagesOpen, setIsAutoMessagesOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#17212b] font-sans text-[#111827] dark:text-[#f3f4f6] antialiased">
      {/* Drawer Global do Telegram */}
      <TelegramDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenAutoMessages={() => setIsAutoMessagesOpen(true)}
      />

      {/* Modal Global de Mensagens Automáticas */}
      <AutoMessagesModal
        isOpen={isAutoMessagesOpen}
        onClose={() => setIsAutoMessagesOpen(false)}
      />

      {/* ── SHELL FULL-WIDTH 100% SEM LIMITES OU BORDAS LATERAIS ── */}
      <div className="w-full min-h-[100dvh] bg-white dark:bg-[#17212b] flex flex-col relative">
        <main className={showNavbar ? 'pb-[60px] flex-1 flex flex-col w-full' : 'flex-1 flex flex-col w-full'}>
          <Outlet context={{ 
            openDrawer: () => setIsDrawerOpen(true),
            openAutoMessages: () => setIsAutoMessagesOpen(true)
          }} />
        </main>

        {showNavbar && <Navbar />}
      </div>
    </div>
  );
}
