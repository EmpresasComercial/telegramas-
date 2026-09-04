/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ConnectivityOverlay } from './components/ConnectivityOverlay';
import { registerServiceWorker, subscribeToPushNotifications, clearAppBadge } from './lib/pushNotifications';
import { LoadingProvider } from './contexts/LoadingContext';
import { GlobalLoadingIndicator } from './components/GlobalLoadingIndicator';

/* ── Lazy imports ─────────────────────────────────────────────────────────── */
// Critical path: carregadas no pacote principal (sem lazy)
import Login  from './pages/Login';
import Signup from './pages/Signup';
import Home   from './pages/Home';

// Todas as outras páginas: carregadas sob-demanda
const Bots             = lazy(() => import('./pages/Bots'));
const Invite           = lazy(() => import('./pages/contacto'));
const Profile          = lazy(() => import('./pages/Profile'));
const Settings         = lazy(() => import('./pages/Settings'));
const AddBank          = lazy(() => import('./pages/AddBank'));
const ChangePassword   = lazy(() => import('./pages/ChangePassword'));
const Recharge         = lazy(() => import('./pages/Recharge'));
const Withdraw         = lazy(() => import('./pages/Withdraw'));
const BankInfo         = lazy(() => import('./pages/BankInfo'));
const WithdrawalHistory = lazy(() => import('./pages/WithdrawalHistory'));
const GeneralHistory   = lazy(() => import('./pages/GeneralHistory'));
const RedeemCoupon     = lazy(() => import('./pages/RedeemCoupon'));
const PurchaseHistory  = lazy(() => import('./pages/PurchaseHistory'));
const Operations       = lazy(() => import('./pages/Operations'));
const AboutUs          = lazy(() => import('./pages/AboutMicrosoft'));
const HelpFAQ          = lazy(() => import('./pages/HelpFAQ'));
const SupportFeedback  = lazy(() => import('./pages/SupportFeedback'));
const PayMoney         = lazy(() => import('./pages/payMoney'));
const ChatsList        = lazy(() => import('./pages/ChatsList'));
const CommunityChat    = lazy(() => import('./pages/CommunityChat'));
const PrivateChat      = lazy(() => import('./pages/PrivateChat'));
const DevicesPrivacy   = lazy(() => import('./pages/DevicesPrivacy'));
const TelegramPremium  = lazy(() => import('./pages/TelegramPremium'));
const TelegramStars    = lazy(() => import('./pages/TelegramStars'));
const OfficialChannel  = lazy(() => import('./pages/OfficialChannel'));

/* ── Skeleton global de transição (Telegram-style) ─────────────────────────── */
function PageSkeleton() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f1f1f2', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      <style>{`
        @keyframes __shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ps { background: linear-gradient(90deg, #ebebeb 0%, #f5f5f5 40%, #ebebeb 100%); background-size: 200% 100%; animation: __shimmer 1s ease-in-out infinite; will-change: background-position; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: '#2481cc', height: 56, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12 }}>
        <div className="ps" style={{ width: 28, height: 28, borderRadius: '50%', opacity: 0.5 }} />
        <div className="ps" style={{ width: 140, height: 18, borderRadius: 4, opacity: 0.5 }} />
        <div style={{ flex: 1 }} />
        <div className="ps" style={{ width: 28, height: 28, borderRadius: '50%', opacity: 0.4 }} />
      </div>

      {/* Search bar */}
      <div style={{ background: '#fff', padding: '8px 12px', borderBottom: '1px solid #ebeef2' }}>
        <div className="ps" style={{ width: '100%', height: 36, borderRadius: 4 }} />
      </div>

      {/* Chat list rows */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div className="ps" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="ps" style={{ width: `${120 + (i % 3) * 30}px`, height: 14, borderRadius: 3 }} />
              <div className="ps" style={{ width: 36, height: 11, borderRadius: 3 }} />
            </div>
            <div className="ps" style={{ width: `${60 + (i % 4) * 40}%`, height: 12, borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Redirect raiz ────────────────────────────────────────────────────────── */
function RootRedirect() {
  const { session, ready } = useAuth();
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get('join');

  if (!ready) return null;
  if (session) return <Navigate to="/home" replace />;
  if (joinCode) return <Navigate to={`/cadastro?join=${joinCode}`} replace />;
  return <Navigate to="/cadastro" replace />;
}

/* ── App ──────────────────────────────────────────────────────────────────── */
export default function App() {
  React.useEffect(() => {
    document.title = 'Telegram Business';

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    clearAppBadge();

    const handleClearBadgeOnFocus = () => {
      if (document.visibilityState === 'visible') clearAppBadge();
    };
    window.addEventListener('focus', handleClearBadgeOnFocus);
    document.addEventListener('visibilitychange', handleClearBadgeOnFocus);

    registerServiceWorker().then(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        subscribeToPushNotifications();
      }
    });

    const iconUrl = '/telegram business_logo_icon_167892.webp?v=2';
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.type = 'image/png';
    link.href = iconUrl;

    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) { appleLink = document.createElement('link'); appleLink.rel = 'apple-touch-icon'; document.head.appendChild(appleLink); }
    appleLink.href = iconUrl;

    return () => {
      window.removeEventListener('focus', handleClearBadgeOnFocus);
      document.removeEventListener('visibilitychange', handleClearBadgeOnFocus);
    };
  }, []);

  return (
    <LanguageProvider>
      <LoadingProvider>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <ConnectivityOverlay />
              <GlobalLoadingIndicator />
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/"        element={<RootRedirect />} />
                  <Route path="/login"   element={<Login />} />
                  <Route path="/cadastro" element={<Signup />} />

                  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="home"                    element={<Home />} />
                    <Route path="bot-pay"                 element={<Bots />} />
                    <Route path="convite"                 element={<Invite />} />
                    <Route path="perfil"                  element={<Profile />} />
                    <Route path="settings"                element={<Navigate to="/perfil" replace />} />
                    <Route path="adicionar-banco"         element={<AddBank />} />
                    <Route path="alterar-senha"           element={<ChangePassword />} />
                    <Route path="configuracoes-conta"     element={<Navigate to="/perfil" replace />} />
                    <Route path="recarregar"              element={<Recharge />} />
                    <Route path="suporte"                 element={<Navigate to="/telegramBussiness" replace />} />
                    <Route path="retirada"                element={<Withdraw />} />
                    <Route path="informacao-bancaria"     element={<BankInfo />} />
                    <Route path="registro-retirada"       element={<WithdrawalHistory />} />
                    <Route path="registro-recarga"        element={<WithdrawalHistory />} />
                    <Route path="registro-transnacionais" element={<WithdrawalHistory />} />
                    <Route path="registro-transacoes"     element={<WithdrawalHistory />} />
                    <Route path="historico-atividades"    element={<GeneralHistory />} />
                    <Route path="historico-geral"         element={<GeneralHistory />} />
                    <Route path="resgate"                 element={<RedeemCoupon />} />
                    <Route path="minhas-compras"          element={<PurchaseHistory />} />
                    <Route path="operacoes"               element={<Operations />} />
                    <Route path="sobre-telegram business" element={<AboutUs />} />
                    <Route path="help-faq"                element={<HelpFAQ />} />
                    <Route path="suporte/feedback"        element={<SupportFeedback />} />
                    <Route path="provas-social"           element={<Navigate to="/home?postarProva=true" replace />} />
                    <Route path="confirmar-recarga"       element={<PayMoney />} />
                    <Route path="payMoney"                element={<PayMoney />} />
                    <Route path="telegramBussiness"       element={<ChatsList />} />
                    <Route path="telegramBusiness"        element={<ChatsList />} />
                    <Route path="telegram-business"       element={<ChatsList />} />
                    <Route path="chat-comunidade"         element={<CommunityChat />} />
                    <Route path="chat/comunidade"         element={<CommunityChat />} />
                    <Route path="comunidade-chat"         element={<CommunityChat />} />
                    <Route path="chat/:contactId"         element={<PrivateChat />} />
                    <Route path="devices"                 element={<DevicesPrivacy />} />
                    <Route path="telegram-premium"        element={<TelegramPremium />} />
                    <Route path="premium"                 element={<TelegramPremium />} />
                    <Route path="stars"                   element={<TelegramStars />} />
                    <Route path="telegram-stars"          element={<TelegramStars />} />
                    <Route path="canais"                  element={<OfficialChannel />} />
                    <Route path="canal-oficial"           element={<OfficialChannel />} />
                  </Route>

                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </LoadingProvider>
    </LanguageProvider>
  );
}
