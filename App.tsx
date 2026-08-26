/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Bots from './pages/Bots';
import Invite from './pages/contacto';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AddBank from './pages/AddBank';
import ChangePassword from './pages/ChangePassword';
import Recharge from './pages/Recharge';
import Withdraw from './pages/Withdraw';
import BankInfo from './pages/BankInfo';
import WithdrawalHistory from './pages/WithdrawalHistory';
import GeneralHistory from './pages/GeneralHistory';
import RedeemCoupon from './pages/RedeemCoupon';
import PurchaseHistory from './pages/PurchaseHistory';
import Operations from './pages/Operations';
import AboutUs from './pages/AboutMicrosoft';
import HelpFAQ from './pages/HelpFAQ';
import SupportFeedback from './pages/SupportFeedback';
import PayMoney from './pages/payMoney';
import ChatsList from './pages/ChatsList';
import CommunityChat from './pages/CommunityChat';
import PrivateChat from './pages/PrivateChat';
import DevicesPrivacy from './pages/DevicesPrivacy';
import TelegramPremium from './pages/TelegramPremium';
import TelegramStars from './pages/TelegramStars';
import { ConnectivityOverlay } from './components/ConnectivityOverlay';
import { registerServiceWorker, subscribeToPushNotifications, clearAppBadge } from './lib/pushNotifications';

function RootRedirect() {
  const { session, ready } = useAuth();
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get('join');

  if (!ready) return null;

  if (session) {
    return <Navigate to="/home" replace />;
  }

  if (joinCode) {
    return <Navigate to={`/cadastro?join=${joinCode}`} replace />;
  }

  return <Navigate to="/cadastro" replace />;
}

export default function App() {
  React.useEffect(() => {
    document.title = 'Telegram Business';
    
    // Captura o evento nativo de instalação do PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Limpar o badge de notificações não lidas ao abrir o app
    clearAppBadge();

    const handleClearBadgeOnFocus = () => {
      if (document.visibilityState === 'visible') {
        clearAppBadge();
      }
    };
    window.addEventListener('focus', handleClearBadgeOnFocus);
    document.addEventListener('visibilitychange', handleClearBadgeOnFocus);

    // Registrar Service Worker para Web Push
    registerServiceWorker().then(() => {
      // Tenta inscrever silenciosamente se já tiver permissão
      if ('Notification' in window && Notification.permission === 'granted') {
        subscribeToPushNotifications();
      }
    });

    // Forçar atualização do Favicon
    const iconUrl = '/telegram business_logo_icon_167892.webp?v=2';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = iconUrl;

    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = iconUrl;

    return () => {
      window.removeEventListener('focus', handleClearBadgeOnFocus);
      document.removeEventListener('visibilitychange', handleClearBadgeOnFocus);
    };
  }, []);

  return (
    <LanguageProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <ConnectivityOverlay />
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Signup />} />

              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="home" element={<Home />} />
                <Route path="bot-pay" element={<Bots />} />
                <Route path="convite" element={<Invite />} />
                <Route path="perfil" element={<Profile />} />
                <Route path="settings" element={<Navigate to="/perfil" replace />} />
                <Route path="adicionar-banco" element={<AddBank />} />
                <Route path="alterar-senha" element={<ChangePassword />} />
                <Route path="configuracoes-conta" element={<Navigate to="/perfil" replace />} />
                <Route path="recarregar" element={<Recharge />} />
                <Route path="suporte" element={<Navigate to="/telegramBussiness" replace />} />
                <Route path="retirada" element={<Withdraw />} />
                <Route path="informacao-bancaria" element={<BankInfo />} />
                <Route path="registro-retirada" element={<WithdrawalHistory />} />
                <Route path="registro-recarga" element={<WithdrawalHistory />} />
                <Route path="registro-transnacionais" element={<WithdrawalHistory />} />
                <Route path="registro-transacoes" element={<WithdrawalHistory />} />
                <Route path="historico-atividades" element={<GeneralHistory />} />
                <Route path="historico-geral" element={<GeneralHistory />} />
                <Route path="resgate" element={<RedeemCoupon />} />
                <Route path="minhas-compras" element={<PurchaseHistory />} />
                <Route path="operacoes" element={<Operations />} />
                <Route path="sobre-telegram business" element={<AboutUs />} />
                <Route path="help-faq" element={<HelpFAQ />} />
                <Route path="suporte/feedback" element={<SupportFeedback />} />
                <Route path="provas-social" element={<Navigate to="/home?postarProva=true" replace />} />
                <Route path="confirmar-recarga" element={<PayMoney />} />
                <Route path="payMoney" element={<PayMoney />} />
                <Route path="telegramBussiness" element={<ChatsList />} />
                <Route path="telegramBusiness" element={<ChatsList />} />
                <Route path="telegram-business" element={<ChatsList />} />
                <Route path="chat-comunidade" element={<CommunityChat />} />
                <Route path="chat/comunidade" element={<CommunityChat />} />
                <Route path="comunidade-chat" element={<CommunityChat />} />
                <Route path="chat/:contactId" element={<PrivateChat />} />
                <Route path="devices" element={<DevicesPrivacy />} />
                <Route path="telegram-premium" element={<TelegramPremium />} />
                <Route path="premium" element={<TelegramPremium />} />
                <Route path="stars" element={<TelegramStars />} />
                <Route path="telegram-stars" element={<TelegramStars />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}
