// src/App.tsx
import { BrowserRouter, useLocation, useRoutes } from "react-router";
import { routes } from "./routes/routes";
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { NotificationService } from "./utils/NotificationService";
import { useAppStore } from "./stores/appStore";
import ApiClient from "./api/api";

import { Backend } from "./api/backend";
import { PageTracker } from "./utils/pageTracker";
// 라우트 설정을 적용하는 컴포넌트
// const AppRoutes = () => {
//   const routeElements = useRoutes(routes);
//   return routeElements;
// };
// 라우트 설정을 적용하는 컴포넌트
const AppRoutes = () => {
  const routeElements = useRoutes(routes);
  const location = useLocation();
  const pageTrackerRef = useRef<PageTracker | null>(null);

  // 페이지 변경 감지
  useEffect(() => {
    if (pageTrackerRef.current) {
      pageTrackerRef.current.updatePage(location.pathname + location.search);
    }
  }, [location]);

  // PageTracker를 상위 컴포넌트로부터 받아오기 위한 ref 설정
  useEffect(() => {
    const tracker = (window as any).pageTracker;
    if (tracker) {
      pageTrackerRef.current = tracker;
    }
  }, []);

  return routeElements;
};

// const backend = new Backend();
const App = () => {
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const setSubscribed = useAppStore((state) => state.setSubscribed);
  const backendRef = useRef<Backend | null>(null);
  const pageTrackerRef = useRef<PageTracker | null>(null);
  const [viewingStatus, setViewingStatus] = useState<{
    page: string;
    isViewing: boolean;
  }>({
    page: "",
    isViewing: true,
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await ApiClient.call(["login/user1"]);
        if (!backendRef.current) {
          console.log("🆕 Creating Backend instance");
          backendRef.current = new Backend();
        } else {
          console.log("♻️ Reusing existing Backend instance");
        }

        backendRef.current.connect();

        // 🚀 페이지 추적기 초기화
        if (!pageTrackerRef.current) {
          console.log("🆕 Creating PageTracker instance");
          pageTrackerRef.current = new PageTracker("user1");

          // 전역에 설정하여 AppRoutes에서 접근 가능하게 함
          (window as any).pageTracker = pageTrackerRef.current;

          pageTrackerRef.current.start();
        }

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
      if (pageTrackerRef.current) {
        console.log("🧹 Cleaning up PageTracker");
        pageTrackerRef.current.stop();
      }
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
  useEffect(() => {
    if (import.meta.env.DEV && pageTrackerRef.current) {
      const interval = setInterval(() => {
        const status = pageTrackerRef.current!.getCurrentStatus();
        setViewingStatus(status);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isAppInitialized]);

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
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
