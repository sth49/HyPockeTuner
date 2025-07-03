// notification-service.ts
import api from "../api/api";

// Base64 URL 디코딩 유틸리티 함수
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// VAPID 공개키 상수화
const VAPID_PUBLIC_KEY =
  "VAPID_PUBLIC_KEY_REMOVED";

export class NotificationService {
  private static registration: ServiceWorkerRegistration | null = null;

  /**
   * 서비스워커 등록 및 초기화
   */
  static async setup(): Promise<ServiceWorkerRegistration> {
    // 서비스워커 지원 여부 확인
    if (!("serviceWorker" in navigator)) {
      throw new Error("Service worker is not supported in this browser");
    }

    try {
      // 기존 등록된 서비스워커 확인
      const existingRegistration =
        await navigator.serviceWorker.getRegistration("/");
      if (existingRegistration) {
        console.log("Service worker already registered");
        this.registration = existingRegistration;

        // 업데이트 확인
        existingRegistration.update();
        return existingRegistration;
      }

      // 새로운 서비스워커 등록
      // 경로를 절대 경로로 수정 (중요!)
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        {
          scope: "/",
          updateViaCache: "none", // 캐시 무시하여 항상 최신 버전 확인
        }
      );

      console.log("Service worker registered successfully", registration);
      this.registration = registration;

      // 서비스워커가 준비될 때까지 대기
      await navigator.serviceWorker.ready;

      return registration;
    } catch (error) {
      console.error("Service worker registration failed:", error);
      throw error;
    }
  }

  /**
   * Push 알림 설정
   */
  static async setupPush(): Promise<boolean> {
    try {
      // 서비스워커가 등록되지 않은 경우 등록
      if (!this.registration) {
        await this.setup();
      }

      // 알림 권한 확인
      if (!this.checkNotificationPermission()) {
        const permission = await this.requestPermission();
        if (permission !== "granted") {
          console.warn("Notification permission denied");
          return false;
        }
      }

      // 서비스워커가 준비될 때까지 대기
      const registration = await navigator.serviceWorker.ready;

      // 기존 구독 확인
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // 새로운 구독 생성
        console.log("Creating new push subscription...");
        subscription = await this.subscribeUserToPush();
        if (!subscription) {
          throw new Error("Failed to create push subscription");
        }
      }

      // 서버에 구독 정보 등록
      const response = await api.registerSubscription(
        JSON.stringify(subscription)
      );
      console.log("Subscription registered:", response);

      return response?.success || false;
    } catch (error) {
      console.error("Error during setupPush:", error);
      return false;
    }
  }

  /**
   * 알림 권한 확인
   */
  static checkNotificationPermission(): boolean {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications.");
      return false;
    }

    return Notification.permission === "granted";
  }

  /**
   * 알림 권한 요청
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("This browser does not support notifications.");
    }

    // 이미 권한이 부여된 경우
    if (Notification.permission === "granted") {
      return "granted";
    }

    // 권한이 거부된 경우
    if (Notification.permission === "denied") {
      throw new Error("Notification permission has been denied");
    }

    // 권한 요청
    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Push 구독 생성
   */
  private static async subscribeUserToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error("Service worker not registered");
    }

    try {
      const subscribeOptions: PushSubscriptionOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      };

      const subscription = await this.registration.pushManager.subscribe(
        subscribeOptions
      );

      console.log("New push subscription created");
      console.log("Endpoint:", subscription.endpoint);
      console.log("Keys:", JSON.parse(JSON.stringify(subscription)).keys);

      return subscription;
    } catch (error) {
      console.error("Failed to subscribe user to push:", error);
      return null;
    }
  }

  /**
   * Push 구독 해제
   */
  static async unsubscribeFromPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        console.log("No service worker registration found");
        return false;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        console.log("No push subscription found");
        return false;
      }

      const result = await subscription.unsubscribe();
      console.log("Push subscription unsubscribed:", result);
      return result;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      return false;
    }
  }

  /**
   * 현재 등록된 서비스워커 가져오기
   */
  static getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }
  static async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.warn("Service worker is not registered");
      return null;
    }
    try {
      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error("Error getting push subscription:", error);
      return null;
    }
  }

  /**
   * 서비스워커 상태 확인 (디버깅용)
   */
  static async getServiceWorkerStatus(): Promise<{
    isSupported: boolean;
    registration: ServiceWorkerRegistration | null;
    subscription: PushSubscription | null;
    permission: NotificationPermission;
  }> {
    const isSupported = "serviceWorker" in navigator;
    let registration: ServiceWorkerRegistration | null = null;
    let subscription: PushSubscription | null = null;
    const permission =
      "Notification" in window ? Notification.permission : "default";

    if (isSupported) {
      try {
        registration =
          (await navigator.serviceWorker.getRegistration("/")) || null;
        if (registration) {
          subscription = await registration.pushManager.getSubscription();
        }
      } catch (error) {
        console.error("Error getting service worker status:", error);
      }
    }

    return {
      isSupported,
      registration,
      subscription,
      permission,
    };
  }
}
