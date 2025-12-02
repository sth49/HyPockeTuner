// notification-service.ts
import api from "../api/api";


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


const VAPID_PUBLIC_KEY =
  "VAPID_PUBLIC_KEY_REMOVED";

export class NotificationService {
  private static registration: ServiceWorkerRegistration | null = null;

  static async setup(): Promise<ServiceWorkerRegistration> {
    console.log("[NotificationService] setup start");

    if (!("serviceWorker" in navigator)) {
      console.error("[NotificationService] Service worker not supported");
      throw new Error("Service worker is not supported in this browser");
    }
    console.log("[NotificationService] Service worker supported");

    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    console.log("[NotificationService] Environment:", isDevelopment ? 'development' : 'production');

    if (isDevelopment) {
      console.log("[NotificationService] Skipping service worker in development");

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
      const swPath = '/HyPockeTuner_new/sw.js';
      const scope = '/HyPockeTuner_new/';

      console.log("[NotificationService] SW path:", swPath);
      console.log("[NotificationService] SW scope:", scope);

      console.log("[NotificationService] Checking existing service worker...");
      const existingRegistration = await navigator.serviceWorker.getRegistration(scope);
      if (existingRegistration) {
        console.log("[NotificationService] Existing service worker found:", existingRegistration);
        this.registration = existingRegistration;

        console.log("[NotificationService] Checking for updates...");
        existingRegistration.update();
        return existingRegistration;
      }

      console.log("[NotificationService] Registering new service worker...");

      const registration = await navigator.serviceWorker.register(swPath, {
        scope: scope,
        updateViaCache: "none",
      });

      console.log("[NotificationService] Service worker registered:", registration);
      console.log("[NotificationService] SW state:", registration.active?.state);
      console.log("[NotificationService] SW script URL:", registration.active?.scriptURL);

      this.registration = registration;

      console.log("[NotificationService] Waiting for service worker ready...");
      await navigator.serviceWorker.ready;
      console.log("[NotificationService] Service worker ready");

      return registration;
    } catch (error) {
      console.error("[NotificationService] Service worker registration failed:", error);
      if (error instanceof Error) {
        console.error("[NotificationService] Error type:", error.constructor.name);
        console.error("[NotificationService] Error message:", error.message);
      }
      throw error;
    }
  }

  static async setupPush(): Promise<boolean> {
    console.log("[NotificationService] setupPush start");

    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    console.log("[NotificationService] Environment:", isDevelopment ? 'development' : 'production');

    if (isDevelopment) {
      console.log("[NotificationService] Simulating push notifications in development");

      console.log("[NotificationService] Checking notification permission...");
      const hasPermission = this.checkNotificationPermission();
      console.log(`[NotificationService] Current permission: ${Notification.permission}`);

      if (!hasPermission) {
        console.log("[NotificationService] Requesting permission...");
        const permission = await this.requestPermission();
        console.log(`[NotificationService] Permission result: ${permission}`);
        if (permission !== "granted") {
          console.warn("[NotificationService] Permission denied");
          return false;
        }
      }

      console.log("[NotificationService] Push setup complete (simulation)");
      return true;
    }

    try {
      console.log("[NotificationService] Checking service worker registration...");
      if (!this.registration) {
        console.log("[NotificationService] Service worker not registered, registering...");
        await this.setup();
        console.log("[NotificationService] Service worker registration complete");
      } else {
        console.log("[NotificationService] Service worker already registered");
      }

      console.log("[NotificationService] Checking notification permission...");
      const hasPermission = this.checkNotificationPermission();
      console.log(`[NotificationService] Current permission: ${Notification.permission}`);

      if (!hasPermission) {
        console.log("[NotificationService] Requesting permission...");
        const permission = await this.requestPermission();
        console.log(`[NotificationService] Permission result: ${permission}`);
        if (permission !== "granted") {
          console.warn("[NotificationService] Permission denied");
          return false;
        }
      }

      console.log("[NotificationService] Waiting for service worker ready...");
      const registration = await navigator.serviceWorker.ready;
      console.log("[NotificationService] Service worker ready");

      console.log("[NotificationService] Checking existing subscription...");
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        console.log("[NotificationService] Existing subscription found:", {
          endpoint: subscription.endpoint,
          keys: JSON.parse(JSON.stringify(subscription)).keys
        });
      } else {
        console.log("[NotificationService] No existing subscription, creating new...");
        subscription = await this.subscribeUserToPush();
        if (!subscription) {
          console.error("[NotificationService] Subscription creation failed");
          throw new Error("Failed to create push subscription");
        }
        console.log("[NotificationService] New subscription created");
      }

      console.log("[NotificationService] Registering subscription with server...");
      console.log("[NotificationService] Subscription data:", subscription);

      const response = await api.registerSubscription(subscription);
      console.log("[NotificationService] Server response:", response);

      const success = response?.success || false;
      console.log(`[NotificationService] setupPush result: ${success ? 'success' : 'failed'}`);
      return success;
    } catch (error) {
      console.error("[NotificationService] setupPush error:", error);
      if (error instanceof Error) {
        console.error("[NotificationService] Error stack:", error.stack);
      }
      return false;
    }
  }

  static checkNotificationPermission(): boolean {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications.");
      return false;
    }

    return Notification.permission === "granted";
  }

  static async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("This browser does not support notifications.");
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission === "denied") {
      throw new Error("Notification permission has been denied");
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  private static async subscribeUserToPush(): Promise<PushSubscription | null> {
    console.log("[NotificationService] subscribeUserToPush start");

    if (!this.registration) {
      console.error("[NotificationService] Service worker not registered");
      throw new Error("Service worker not registered");
    }

    try {
      console.log("[NotificationService] VAPID public key:", VAPID_PUBLIC_KEY);

      const subscribeOptions: PushSubscriptionOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      };

      console.log("[NotificationService] Subscribe options:", subscribeOptions);
      console.log("[NotificationService] PushManager subscribe attempt...");

      const subscription = await this.registration.pushManager.subscribe(
        subscribeOptions
      );

      console.log("[NotificationService] New push subscription created");
      console.log("[NotificationService] Endpoint:", subscription.endpoint);
      console.log("[NotificationService] Keys:", JSON.parse(JSON.stringify(subscription)).keys);

      return subscription;
    } catch (error) {
      console.error("[NotificationService] Push subscription creation failed:", error);
      if (error instanceof Error) {
        console.error("[NotificationService] Error type:", error.constructor.name);
        console.error("[NotificationService] Error message:", error.message);

        if (error.name === 'NotSupportedError') {
          console.error("[NotificationService] Push notifications not supported");
        } else if (error.name === 'NotAllowedError') {
          console.error("[NotificationService] Push notification permission denied");
        } else if (error.name === 'AbortError') {
          console.error("[NotificationService] Subscription process aborted");
        }
      }

      return null;
    }
  }

  static async unsubscribeFromPush(): Promise<boolean> {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isDevelopment) {
      console.log("[NotificationService] Simulating unsubscribe in development");
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

  static getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  static async getSubscription(): Promise<PushSubscription | null> {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isDevelopment) {
      console.log("[NotificationService] Returning mock subscription in development");

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
