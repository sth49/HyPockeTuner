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
    console.log("🛠️ [NotificationService] setup 시작");
    
    // 서비스워커 지원 여부 확인
    if (!("serviceWorker" in navigator)) {
      console.error("❌ [NotificationService] 서비스워커가 브라우저에서 지원되지 않음");
      throw new Error("Service worker is not supported in this browser");
    }
    console.log("✅ [NotificationService] 서비스워커 지원 확인됨");

    // 개발환경 감지
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    console.log("🏠 [NotificationService] 환경 감지:", isDevelopment ? '개발환경' : '프로덕션환경');

    if (isDevelopment) {
      console.log("🚧 [NotificationService] 개발환경에서는 서비스워커를 건너뜁니다");
      // 개발환경에서는 가짜 registration 객체 반환
      const mockRegistration = {
        active: null,
        installing: null,
        waiting: null,
        scope: '/HyPockeTuner_new/',
        updateViaCache: 'imports' as ServiceWorkerUpdateViaCache,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        update: async () => {},
        unregister: async () => true,
        pushManager: {
          getSubscription: async () => null,
          subscribe: async () => {
            throw new Error("Push notifications not available in development");
          }
        }
      } as unknown as ServiceWorkerRegistration;
      
      this.registration = mockRegistration;
      return mockRegistration;
    }

    try {
      // 프로덕션환경에서만 실제 서비스워커 등록
      const swPath = '/HyPockeTuner_new/sw.js';
      const scope = '/HyPockeTuner_new/';
      
      console.log("📍 [NotificationService] SW 경로:", swPath);
      console.log("📍 [NotificationService] SW 스코프:", scope);

      // 기존 등록된 서비스워커 확인
      console.log("🔍 [NotificationService] 기존 서비스워커 등록 확인...");
      const existingRegistration = await navigator.serviceWorker.getRegistration(scope);
      if (existingRegistration) {
        console.log("♻️ [NotificationService] 기존 서비스워커 발견:", existingRegistration);
        this.registration = existingRegistration;

        // 업데이트 확인
        console.log("🔄 [NotificationService] 서비스워커 업데이트 확인...");
        existingRegistration.update();
        return existingRegistration;
      }

      // 새로운 서비스워커 등록
      console.log("📝 [NotificationService] 새 서비스워커 등록 시도...");
      
      const registration = await navigator.serviceWorker.register(swPath, {
        scope: scope,
        updateViaCache: "none", // 캐시 무시하여 항상 최신 버전 확인
      });

      console.log("✅ [NotificationService] 서비스워커 등록 성공:", registration);
      console.log("📋 [NotificationService] SW 상태:", registration.active?.state);
      console.log("📋 [NotificationService] SW 스크립트 URL:", registration.active?.scriptURL);
      
      this.registration = registration;

      // 서비스워커가 준비될 때까지 대기
      console.log("⏳ [NotificationService] 서비스워커 준비 대기...");
      await navigator.serviceWorker.ready;
      console.log("✅ [NotificationService] 서비스워커 준비 완료");

      return registration;
    } catch (error) {
      console.error("💥 [NotificationService] 서비스워커 등록 실패:", error);
      if (error instanceof Error) {
        console.error("💥 [NotificationService] 에러 타입:", error.constructor.name);
        console.error("💥 [NotificationService] 에러 메시지:", error.message);
      }
      throw error;
    }
  }

  /**
   * Push 알림 설정
   */
  static async setupPush(): Promise<boolean> {
    console.log("🚀 [NotificationService] setupPush 시작");
    
    // 개발환경 감지
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    console.log("🏠 [NotificationService] 환경 감지:", isDevelopment ? '개발환경' : '프로덕션환경');

    if (isDevelopment) {
      console.log("🚧 [NotificationService] 개발환경에서는 푸시 알림을 시뮬레이션합니다");
      
      // 알림 권한만 확인/요청
      console.log("🔐 [NotificationService] 알림 권한 확인...");
      const hasPermission = this.checkNotificationPermission();
      console.log(`📋 [NotificationService] 현재 알림 권한: ${Notification.permission}`);
      
      if (!hasPermission) {
        console.log("❓ [NotificationService] 알림 권한 요청...");
        const permission = await this.requestPermission();
        console.log(`📋 [NotificationService] 권한 요청 결과: ${permission}`);
        if (permission !== "granted") {
          console.warn("❌ [NotificationService] 알림 권한이 거부됨");
          return false;
        }
      }
      
      console.log("✅ [NotificationService] 개발환경에서 푸시 설정 완료 (시뮬레이션)");
      return true;
    }

    try {
      // 서비스워커가 등록되지 않은 경우 등록
      console.log("📝 [NotificationService] 서비스워커 등록 상태 확인...");
      if (!this.registration) {
        console.log("⚠️ [NotificationService] 서비스워커가 등록되지 않음, 등록 시도...");
        await this.setup();
        console.log("✅ [NotificationService] 서비스워커 등록 완료");
      } else {
        console.log("✅ [NotificationService] 서비스워커 이미 등록됨");
      }

      // 알림 권한 확인
      console.log("🔐 [NotificationService] 알림 권한 확인...");
      const hasPermission = this.checkNotificationPermission();
      console.log(`📋 [NotificationService] 현재 알림 권한: ${Notification.permission}`);
      
      if (!hasPermission) {
        console.log("❓ [NotificationService] 알림 권한 요청...");
        const permission = await this.requestPermission();
        console.log(`📋 [NotificationService] 권한 요청 결과: ${permission}`);
        if (permission !== "granted") {
          console.warn("❌ [NotificationService] 알림 권한이 거부됨");
          return false;
        }
      }

      // 서비스워커가 준비될 때까지 대기
      console.log("⏳ [NotificationService] 서비스워커 준비 대기...");
      const registration = await navigator.serviceWorker.ready;
      console.log("✅ [NotificationService] 서비스워커 준비 완료");

      // 기존 구독 확인
      console.log("🔍 [NotificationService] 기존 구독 확인...");
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log("✅ [NotificationService] 기존 구독 발견:", {
          endpoint: subscription.endpoint,
          keys: JSON.parse(JSON.stringify(subscription)).keys
        });
      } else {
        console.log("📝 [NotificationService] 기존 구독 없음, 새 구독 생성...");
        subscription = await this.subscribeUserToPush();
        if (!subscription) {
          console.error("❌ [NotificationService] 구독 생성 실패");
          throw new Error("Failed to create push subscription");
        }
        console.log("✅ [NotificationService] 새 구독 생성 완료");
      }

      // 서버에 구독 정보 등록
      console.log("📤 [NotificationService] 서버에 구독 정보 등록 시도...");
      console.log("📤 [NotificationService] 전송할 구독 데이터:", subscription);
      
      const response = await api.registerSubscription(subscription);
      console.log("📥 [NotificationService] 서버 응답:", response);

      const success = response?.success || false;
      console.log(`🎯 [NotificationService] setupPush 결과: ${success ? '성공' : '실패'}`);
      return success;
    } catch (error) {
      console.error("💥 [NotificationService] setupPush 오류:", error);
      if (error instanceof Error) {
        console.error("💥 [NotificationService] 오류 스택:", error.stack);
      }
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
    console.log("🔧 [NotificationService] subscribeUserToPush 시작");
    
    if (!this.registration) {
      console.error("❌ [NotificationService] 서비스워커가 등록되지 않음");
      throw new Error("Service worker not registered");
    }

    try {
      console.log("🔑 [NotificationService] VAPID 공개키:", VAPID_PUBLIC_KEY);
      
      const subscribeOptions: PushSubscriptionOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      };
      
      console.log("⚙️ [NotificationService] 구독 옵션:", subscribeOptions);
      console.log("📱 [NotificationService] PushManager 구독 시도...");

      const subscription = await this.registration.pushManager.subscribe(
        subscribeOptions
      );

      console.log("✅ [NotificationService] 새 푸시 구독 생성 완료");
      console.log("🌐 [NotificationService] Endpoint:", subscription.endpoint);
      console.log("🔐 [NotificationService] Keys:", JSON.parse(JSON.stringify(subscription)).keys);

      return subscription;
    } catch (error) {
      console.error("💥 [NotificationService] 푸시 구독 생성 실패:", error);
      if (error instanceof Error) {
        console.error("💥 [NotificationService] 에러 타입:", error.constructor.name);
        console.error("💥 [NotificationService] 에러 메시지:", error.message);
        
        // 특정 에러 유형에 대한 추가 정보
        if (error.name === 'NotSupportedError') {
          console.error("🚫 [NotificationService] 푸시 알림이 지원되지 않는 환경");
        } else if (error.name === 'NotAllowedError') {
          console.error("🚫 [NotificationService] 푸시 알림 권한이 거부됨");
        } else if (error.name === 'AbortError') {
          console.error("🚫 [NotificationService] 구독 프로세스가 중단됨");
        }
      }
      
      return null;
    }
  }

  /**
   * Push 구독 해제
   */
  static async unsubscribeFromPush(): Promise<boolean> {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      console.log("🚧 [NotificationService] 개발환경에서는 구독 해제를 시뮬레이션합니다");
      return true;
    }

    try {
      const scope = '/HyPockeTuner_new/';
      
      const registration = await navigator.serviceWorker.getRegistration(scope);
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
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      console.log("🚧 [NotificationService] 개발환경에서는 가짜 구독 정보를 반환합니다");
      // 개발환경에서는 가짜 구독 객체 반환
      return {
        endpoint: 'https://development.example.com/push',
        keys: {
          p256dh: 'development-key-p256dh',
          auth: 'development-key-auth'
        },
        unsubscribe: async () => true,
        toJSON: () => ({
          endpoint: 'https://development.example.com/push',
          keys: {
            p256dh: 'development-key-p256dh',
            auth: 'development-key-auth'
          }
        })
      } as unknown as PushSubscription;
    }

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
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isDevelopment) {
          // 개발환경에서는 시뮬레이션 데이터 반환
          registration = this.registration;
          subscription = await this.getSubscription();
        } else {
          const scope = '/HyPockeTuner_new/';
          registration = (await navigator.serviceWorker.getRegistration(scope)) || null;
          if (registration) {
            subscription = await registration.pushManager.getSubscription();
          }
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
