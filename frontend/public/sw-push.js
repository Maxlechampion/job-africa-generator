/**
 * Service Worker — Gestion des notifications push.
 */

self.addEventListener("push", (event) => {
  console.log("[SW] Push recu:", event);

  let data = {
    title: "Job Africa",
    body: "Nouvelle notification",
    url: "/jobs",
    icon: "/icons/pwa-192x192.png",
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: "/icons/pwa-192x192.png",
    tag: data.tag || "job-africa",
    data: {
      url: data.url,
      timestamp: data.timestamp,
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: "open", title: "Voir l'offre" },
      { action: "close", title: "Ignorer" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});


self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification cliquee:", event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const urlToOpen = data.url || "/jobs";

  if (action === "close") return;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});


self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Souscription changee:", event);

  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) => {
        return fetch("/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
  );
});
