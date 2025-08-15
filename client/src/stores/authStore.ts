import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SERVER_URL } from "../api/const";

interface AuthState {
  // 인증 상태
  isAuthenticated: boolean;
  currentUser: string | null;
  token: string | null;
  
  // 액션들
  login: (userId: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUser: null,
      token: null,

      login: (userId: string) => {
        set({
          isAuthenticated: true,
          currentUser: userId,
          token: userId, // 서버에서 token은 userId와 동일하게 처리
        });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          currentUser: null,
          token: null,
        });
      },

      setToken: (token: string) => {
        set({ token });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          return false;
        }

        try {
          const response = await fetch(`${SERVER_URL}check_token/${token}`);
          const result = await response.json();
          
          if (result.success) {
            set({ isAuthenticated: true });
            return true;
          } else {
            get().logout();
            return false;
          }
        } catch (error) {
          console.error("토큰 검증 실패:", error);
          get().logout();
          return false;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);