// /// <reference lib="webworker" />
// import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
// import { clientsClaim } from 'workbox-core'
// import { NavigationRoute, registerRoute } from 'workbox-routing'

// declare let self: ServiceWorkerGlobalScope

// // self.__WB_MANIFEST is the default injection point
// precacheAndRoute(self.__WB_MANIFEST)

// // clean old assets
// cleanupOutdatedCaches()

// let allowlist: RegExp[] | undefined
// // in dev mode, we disable precaching to avoid caching issues
// if (import.meta.env.DEV)
//   allowlist = [/^\/$/]
// else
//   // GitHub Pages용 allowlist (base path 고려)
//   allowlist = [/^\/HyPockeTuner_new\/.*$/]

// // to allow work offline
// registerRoute(new NavigationRoute(
//   createHandlerBoundToURL('/HyPockeTuner_new/index.html'),
//   { allowlist },
// ))

// self.skipWaiting()
// clientsClaim()

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
// GitHub Pages용 allowlist (base path 고려)
else allowlist = [/^\/HyPockeTuner_new\/.*$/];

// to allow work offline
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/HyPockeTuner_new/index.html"), {
    allowlist,
  })
);

self.skipWaiting();
clientsClaim();

// ===== 푸시 알림 처리 코드 추가 =====

self.addEventListener("activate", (e) => {
  console.log("Service Worker 활성화됨");
  e.waitUntil(self.clients.claim());
});

self.addEventListener("install", () => {
  console.log("Service Worker 설치됨");
  // 즉시 활성화
  self.skipWaiting();
});

self.addEventListener("message", (e) => {
  console.log("메시지 수신:", e.data);
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", function (e) {
  console.log("[Service Worker] Push Received.");

  if (!e.data) {
    console.log("푸시 데이터 없음");
    return;
  }

  const data = e.data.json();
  console.log("[Service Worker] Push data: ", data);

  const title = data.key || "기본 제목";
  const options = {
    body: data.value?.content || "기본 메시지",
    icon: "/HyPockeTuner_new/logo192.png",
    badge: "/HyPockeTuner_new/logo192.png", 
    data: {
      exp: data.value?.exp
    }
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  console.log("알림 클릭:", e);
  e.notification.close();

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        let focusedClient = null;
        for (const client of clients) {
          console.log("클라이언트:", client);
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
  console.log("알림 닫힘:", e);
});

self.addEventListener("pushsubscriptionchange", (e) => {
  console.log("푸시 구독 변경:", e);
});

console.log("서비스 워커가 로드되었습니다.");
