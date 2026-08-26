// Service Worker para Telegram Business - Push Notifications
const CACHE_NAME = 'telegram business-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escuta eventos de Notificação Push
self.addEventListener('push', (event) => {
  let data = {
    title: 'Telegram Business',
    body: 'Você tem uma nova notificação na sua conta.',
    icon: '/telegram business_logo_icon_167892.webp',
    badge: '/telegram business_logo_icon_167892.webp',
    url: '/perfil',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/telegram business_logo_icon_167892.webp',
    badge: data.badge || '/telegram business_logo_icon_167892.webp',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'telegram business-notification',
    renotify: true,
    data: {
      url: data.url || '/perfil',
    },
    actions: [
      {
        action: 'open',
        title: 'Ver no App',
      },
    ],
  };

  event.waitUntil(
    (async () => {
      // 1. Exibe a notificação push
      await self.registration.showNotification(data.title, options);

      // 2. Incrementa o número no badge do ícone do PWA
      try {
        if ('setAppBadge' in navigator) {
          const notifications = await self.registration.getNotifications();
          const count = Math.max(1, notifications.length);
          await navigator.setAppBadge(count);
        }
      } catch (err) {
        console.debug('Badge API error:', err);
      }
    })()
  );
});

// Ao clicar na notificação, abre o app direto na tela correspondente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Limpa o badge do ícone do PWA
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }

  const rawUrl = event.notification.data?.url || '/perfil';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Se o app já estiver aberto em alguma aba/PWA, navega até a tela e traz para foco
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // 2. Se o app estiver fechado no celular, abre direto na página da notificação
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
