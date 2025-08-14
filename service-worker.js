self.addEventListener("activate", (e) => {
  console.log("Service Worker 활성화됨"), e.waitUntil(self.clients.claim());
});
self.addEventListener("install", (e) => {
  console.log("Service Worker 설치됨"), self.skipWaiting();
});
self.addEventListener("message", (e) => {
  console.log("메시지 수신:", e.data),
    e.data && e.data.type === "SKIP_WAITING" && self.skipWaiting();
});
self.addEventListener("push", function (e) {
  if ((console.log("[Service Worker] Push Received."), !e.data)) {
    console.log("푸시 데이터 없음");
    return;
  }
  const i = e.data.json();
  console.log("[Service Worker] Push data: ", i);
  const o = i.key || "기본 제목",
    n = {
      body: i.value.content || "기본 메시지",
      icon: "icons/icon-192x192.png",
      badge: "icons/badge-72x72.png",
    };
  e.waitUntil(self.registration.showNotification(o, n));
});
self.addEventListener("notificationclick", (e) => {
  console.log("알림 클릭:", e),
    e.notification.close(),
    e.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: !0 })
        .then((i) => {
          let o = null;
          for (const n of i)
            if ((console.log("클라이언트:", n), "focus" in n)) {
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
  console.log("알림 닫힘:", e);
});
self.addEventListener("pushsubscriptionchange", (e) => {
  console.log("푸시 구독 변경:", e);
});
console.log("서비스 워커가 로드되었습니다.");
