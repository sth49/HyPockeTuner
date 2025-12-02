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

// const AppRoutes = () => {
//   const routeElements = useRoutes(routes);
//   return routeElements;
// };

const AppRoutes = () => {
  const routeElements = useRoutes(routes);
  const navigate = useNavigate();
  // const pageTrackerRef = useRef<PageTracker | null>(null);

  
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

  
  // useEffect(() => {
  //   if (pageTrackerRef.current) {
  //     pageTrackerRef.current.updatePage(location.pathname + location.search);
  //   }
  // }, [location]);

  
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
            false
          ).catch((error) => {
            console.error("Failed to send visibility data:", error);
          });
        } else {
          console.log("Page is visible");
          ApiClient.postVisibility(
            currentUser,
            true
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

  
  useEffect(() => {
    let prevIsAuthenticated = useAuthStore.getState().isAuthenticated;

    const unsubscribe = useAuthStore.subscribe((state) => {
      const { isAuthenticated, currentUser } = state;

      
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

        
        // if (!pageTrackerRef.current) {
        //   console.log("🆕 Creating PageTracker instance");
        //   pageTrackerRef.current = new PageTracker("user1");

        
        //   (window as any).pageTracker = pageTrackerRef.current;

        //   pageTrackerRef.current.start();
        // }

        // backend.connect();

        setIsAppInitialized(true);
        

        setIsAppInitialized(true);
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
