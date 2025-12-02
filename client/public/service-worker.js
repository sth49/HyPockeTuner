self.addEventListener("activate", (e) => {
  console.log("Service Worker activated"), e.waitUntil(self.clients.claim());
});
self.addEventListener("install", (e) => {
  console.log("Service Worker installed"), self.skipWaiting();
});
self.addEventListener("message", (e) => {
  console.log("Message received:", e.data),
    e.data && e.data.type === "SKIP_WAITING" && self.skipWaiting();
});
self.addEventListener("push", function (e) {
  if ((console.log("[Service Worker] Push Received."), !e.data)) {
    console.log("No push data");
    return;
  }
  const i = e.data.json();
  console.log("[Service Worker] Push data: ", i);
  const o = i.key || "Default Title",
    n = {
      body: i.value.content || "Default Message",
      icon: "icons/icon-192x192.png",
      badge: "icons/badge-72x72.png",
    };
  e.waitUntil(self.registration.showNotification(o, n));
});
self.addEventListener("notificationclick", (e) => {
  console.log("Notification clicked:", e),
    e.notification.close(),
    e.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: !0 })
        .then((i) => {
          let o = null;
          for (const n of i)
            if ((console.log("Client:", n), "focus" in n)) {
              o = n;
              break;
            }
          return o
            ? (o.postMessage({
                type: "navigate",
                page: "notification",
                exp: e.notification.data.exp,
              }),
              o.focus())
            : self.clients.openWindow("/");
        })
    );
});
self.addEventListener("notificationclose", (e) => {
  console.log("Notification closed:", e);
});
self.addEventListener("pushsubscriptionchange", (e) => {
  console.log("Push subscription changed:", e);
});
console.log("Service worker loaded.");
