/* MFB Chat Web Push service worker */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "MFB Chat",
      body: event.data ? event.data.text() : "Yeni mesajınız var.",
    };
  }

  const title = data.title || "MFB Chat";
  const body = data.body || "Yeni mesajınız var.";
  const url = data.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const hasVisibleClient = clients.some(
          (client) => client.visibilityState === "visible",
        );

        if (hasVisibleClient) return;

        return self.registration.showNotification(title, {
          body,
          tag: data.chatId ? `mfb-chat-${data.chatId}` : "mfb-chat-message",
          renotify: true,
          data: { url },
        });
      }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});
