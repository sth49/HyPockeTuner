/* eslint-disable @typescript-eslint/no-explicit-any */
// src/stores/appStore.ts
import { create } from "zustand";

interface AppState {
  // 구독상태
  isSubscribed: boolean;
  setSubscribed: (status: boolean) => void;
  // 소켓 연결 상태
  isSocketConnected: boolean;
  setIsSocketConnected: (status: boolean) => void;
  // 오프라인 상태 추적
  // isOnline: boolean;
  // PWA 업데이트 상태
  // updateAvailable: boolean;
  // 앱 테마 (다크/라이트 모드)
  // theme: "light" | "dark";
  // 앱 상태 업데이트 함수들
  // setOnlineStatus: (status: boolean) => void;
  // setUpdateAvailable: (status: boolean) => void;
  // toggleTheme: () => void;
  // setTheme: (theme: "light" | "dark") => void;
  // 보류 중인 작업 관리(오프라인 지원)
  // pendingActions: any[];
  // addPendingAction: (action: any) => void;
  // processPendingActions: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  (set) => ({
    isSubscribed: false,
    setSubscribed: (status) => {
      set({ isSubscribed: status });
    },
    isSocketConnected: false,
    setIsSocketConnected: (status) => {
      set({ isSocketConnected: status });
    },

    // isOnline: navigator.onLine,
    // updateAvailable: false,
    // theme: "light",
    // pendingActions: [],

    // setOnlineStatus: (status) => {
    //   set({ isOnline: status });
    //   // 온라인으로 변경 시 보류 중인 작업 처리
    //   if (status) {
    //     get().processPendingActions();
    //   }
    // },

    // setUpdateAvailable: (status) => {
    //   set({ updateAvailable: status });
    // },

    // toggleTheme: () => {
    //   set((state) => ({
    //     theme: state.theme === "light" ? "dark" : "light",
    //   }));
    // },

    // setTheme: (theme) => {
    //   set({ theme });
    // },

    // addPendingAction: (action) => {
    //   set((state) => ({
    //     pendingActions: [...state.pendingActions, action],
    //   }));
    // },

    // processPendingActions: async () => {
    //   const { pendingActions } = get();
    //   if (pendingActions.length === 0) return;

    //   try {
    //     // 실제 구현 시 각 작업 유형에 따라 처리
    //     // 예: API 요청, 데이터 동기화 등
    //     console.log("Processing pending actions:", pendingActions);

    //     // 모든 작업이 처리되었다고 가정하고 배열 비우기
    //     set({ pendingActions: [] });
    //   } catch (error) {
    //     console.error("Failed to process pending actions:", error);
    //   }
    // },
  })
  // {
  //   name: "app-storage",
  //   partialize: (state) => ({
  //     theme: state.theme,
  //     pendingActions: state.pendingActions,
  //   }),
  // }
);

// 오프라인/온라인 상태 감지를 위한 이벤트 리스너 설정
// export const setupNetworkListeners = () => {
//   const { setOnlineStatus } = useAppStore.getState();

//   window.addEventListener("online", () => {
//     setOnlineStatus(true);
//   });

//   window.addEventListener("offline", () => {
//     setOnlineStatus(false);
//   });
// };
