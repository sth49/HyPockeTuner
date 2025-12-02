/* eslint-disable @typescript-eslint/no-explicit-any */
// src/stores/appStore.ts
import { create } from "zustand";

interface AppState {
  isSubscribed: boolean;
  setSubscribed: (status: boolean) => void;
  isSocketConnected: boolean;
  setIsSocketConnected: (status: boolean) => void;
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

  })
);
