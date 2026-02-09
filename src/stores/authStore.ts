import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Session, User } from '../types/auth';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  setAuth: (user: User, session: Session) => void;
  logout: () => void;
  updateSession: (session: Session) => void;
  updateUser: (user: User) => void;
  updateUserMetadata: (metadata: Partial<User['user_metadata']>) => void;
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

      updateSession: (session) =>
        set((state) => ({
          session: state.session ? { ...state.session, ...session } : session,
          isAuthenticated: true,
        })),

      updateUser: (user) =>
        set(() => ({
          user,
          isAuthenticated: true,
        })),

      updateUserMetadata: (metadata) =>
        set((state) => {
          if (!state.user) return {};
          return {
            user: {
              ...state.user,
              user_metadata: {
                ...state.user.user_metadata,
                ...metadata,
              },
            },
          };
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
