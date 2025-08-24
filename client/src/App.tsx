// src/App.tsx
import { BrowserRouter, useRoutes, useNavigate } from "react-router";
import { routes } from "./routes/routes";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { NotificationService } from "./utils/NotificationService";
import { useAppStore } from "./stores/appStore";
import { useAuthStore } from "./stores/authStore";
import ApiClient from "./api/api";
import ProtectedRoute from "./components/ProtectedRoute";

import { Backend } from "./api/backend";
// 라우트 설정을 적용하는 컴포넌트
// const AppRoutes = () => {
//   const routeElements = useRoutes(routes);
//   return routeElements;
// };
// 라우트 설정을 적용하는 컴포넌트
const AppRoutes = () => {
  const routeElements = useRoutes(routes);
  const navigate = useNavigate();
  // const pageTrackerRef = useRef<PageTracker | null>(null);

  // Service Worker 메시지 리스너 추가
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'navigate' && event.data?.page === 'notification') {
        console.log('Navigating to notification page for experiment:', event.data.exp);
        navigate('/main/notification');
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [navigate]);

  // 페이지 변경 감지
  // useEffect(() => {
  //   if (pageTrackerRef.current) {
  //     pageTrackerRef.current.updatePage(location.pathname + location.search);
  //   }
  // }, [location]);

  // PageTracker를 상위 컴포넌트로부터 받아오기 위한 ref 설정
  // useEffect(() => {
  //   const tracker = (window as any).pageTracker;
  //   if (tracker) {
  //     pageTrackerRef.current = tracker;
  //   }
  // }, []);

  return routeElements;
};

// const backend = new Backend();
const App = () => {
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const setSubscribed = useAppStore((state) => state.setSubscribed);
  const backendRef = useRef<Backend | null>(null);
  // const pageTrackerRef = useRef<PageTracker | null>(null);
  // const [viewingStatus, setViewingStatus] = useState<{
  //   page: string;
  //   isViewing: boolean;
  // }>({
  //   page: "",
  //   isViewing: true,
  // });

  useEffect(() => {
    const handleVisibilityChange = () => {
      const { currentUser, isAuthenticated } = useAuthStore.getState();

      if (isAuthenticated && currentUser) {
        if (document.hidden) {
          ApiClient.postVisibility(
            currentUser,
            false // 페이지가 숨겨졌을 때
          ).catch((error) => {
            console.error("Failed to send visibility data:", error);
          });
        } else {
          console.log("Page is visible");
          ApiClient.postVisibility(
            currentUser,
            true // 페이지가 보일 때
          ).catch((error) => {
            console.error("Failed to send visibility data:", error);
          });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  });

  // 인증 상태 변경을 감지하여 백엔드 연결을 관리하는 effect
  useEffect(() => {
    let prevIsAuthenticated = useAuthStore.getState().isAuthenticated;

    const unsubscribe = useAuthStore.subscribe((state) => {
      const { isAuthenticated, currentUser } = state;

      // 인증 상태가 실제로 변경되었을 때만 처리
      if (prevIsAuthenticated !== isAuthenticated) {
        console.log("🔄 Auth state changed:", { isAuthenticated, currentUser });

        if (isAuthenticated && currentUser) {
          console.log("✅ User authenticated, initializing backend...");

          const initializeBackend = async () => {
            try {
              // Verify login status with server
              await ApiClient.login(currentUser);

              if (!backendRef.current) {
                console.log("🆕 Creating Backend instance");
                backendRef.current = new Backend();
              }

              backendRef.current.connect();
              setIsAppInitialized(true);
            } catch (error) {
              console.error("❌ Failed to initialize backend:", error);
            }
          };

          initializeBackend();
        } else {
          console.log("❌ User not authenticated, cleaning up backend...");
          if (backendRef.current) {
            backendRef.current.cleanup();
            backendRef.current = null;
          }
          setIsAppInitialized(false);
        }

        prevIsAuthenticated = isAuthenticated;
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { currentUser, isAuthenticated } = useAuthStore.getState();

        // Connect backend if user is already authenticated on initial load
        if (isAuthenticated && currentUser) {
          console.log("🔄 Initial load with authenticated user:", currentUser);

          await ApiClient.login(currentUser);

          if (!backendRef.current) {
            console.log("🆕 Creating Backend instance");
            backendRef.current = new Backend();
          }

          backendRef.current.connect();
        }

        // 🚀 페이지 추적기 초기화
        // if (!pageTrackerRef.current) {
        //   console.log("🆕 Creating PageTracker instance");
        //   pageTrackerRef.current = new PageTracker("user1");

        //   // 전역에 설정하여 AppRoutes에서 접근 가능하게 함
        //   (window as any).pageTracker = pageTrackerRef.current;

        //   pageTrackerRef.current.start();
        // }

        // backend.connect();

        setIsAppInitialized(true); // 초기화 완료
        // 데이터 처리...

        setIsAppInitialized(true); // 초기화 완료
      } catch (error) {
        console.error("App initialization error:", error);
      }
    };

    initializeApp();
    return () => {
      // if (pageTrackerRef.current) {
      //   console.log("🧹 Cleaning up PageTracker");
      //   pageTrackerRef.current.stop();
      // }
    };
  }, []);

  useEffect(() => {
    async function setupNotifications() {
      try {
        await NotificationService.setup();
        console.log("Service worker registered successfully");

        const pushSetupResult = await NotificationService.setupPush();
        console.log("pushSetupResult", pushSetupResult);
        if (pushSetupResult) {
          setSubscribed(true);
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
        setSubscribed(false);
      }
    }

    setupNotifications();
  }, []);

  // 개발 환경에서 현재 상태 모니터링
  // useEffect(() => {
  //   if (import.meta.env.DEV && pageTrackerRef.current) {
  //     const interval = setInterval(() => {
  //       const status = pageTrackerRef.current!.getCurrentStatus();
  //       setViewingStatus(status);
  //     }, 1000);

  //     return () => clearInterval(interval);
  //   }
  // }, [isAppInitialized]);

  if (!isAppInitialized) {
    return (
      <div>
        <p>Loading</p>
      </div>
    );
  }

  if (!isAppInitialized) {
    return (
      <div>
        <p>Loading</p>
      </div>
    );
  }

  return (
    <BrowserRouter basename="/HyPockeTuner_new">
      <ProtectedRoute>
        <AppRoutes />
      </ProtectedRoute>
    </BrowserRouter>
  );
};

export default App;
