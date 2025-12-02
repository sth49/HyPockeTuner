/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope;

// self.__WB_MANIFEST is the default injection point
precacheAndRoute(self.__WB_MANIFEST);

// clean old assets
cleanupOutdatedCaches();

let allowlist: RegExp[] | undefined;
// in dev mode, we disable precaching to avoid caching issues
if (import.meta.env.DEV) allowlist = [/^\/$/];
else allowlist = [/^\/HyPockeTuner_new\/.*$/];

// to allow work offline
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/HyPockeTuner_new/index.html"), {
    allowlist,
  })
);

self.skipWaiting();
clientsClaim();

self.addEventListener("activate", (e) => {
  console.log("Service Worker activated");
  e.waitUntil(self.clients.claim());
});

self.addEventListener("install", () => {
  console.log("Service Worker installed");
  self.skipWaiting();
});

self.addEventListener("message", (e) => {
  console.log("Message received:", e.data);
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", function (e) {
  console.log("[Service Worker] Push Received.");

  if (!e.data) {
    console.log("No push data");
    return;
  }

  const data = e.data.json();
  console.log("[Service Worker] Push data: ", data);

  const title = data.key || "Default Title";
  const options = {
    body: data.value?.content || "Default Message",
    icon: "/HyPockeTuner_new/vite.svg",
    badge: "/HyPockeTuner_new/vite.svg",
    data: {
      exp: data.value?.exp
    }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  console.log("Notification clicked:", e);
  e.notification.close();

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        let focusedClient = null;
        for (const client of clients) {
          console.log("Client:", client);
          if ("focus" in client) {
            focusedClient = client;
            break;
          }
        }

        if (focusedClient) {
          if (e.notification.data?.exp) {
            focusedClient.postMessage({
              type: "navigate",
              page: "notification",
              exp: e.notification.data.exp,
            });
          }
          return focusedClient.focus();
        } else {
          return self.clients.openWindow("/HyPockeTuner_new/");
        }
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
