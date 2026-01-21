import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, User } from "../types/auth";

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  setAuth: (user: User, session: Session) => void;
  logout: () => void;
  updateToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,

      setAuth: (user, session) =>
        set({
          user,
          session,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        }),

      updateToken: (token) =>
        set((state) => ({
          session: state.session
            ? { ...state.session, access_token: token }
            : null,
        })),
    }),
    {
      name: "auth-storage",
    },
  ),
);
