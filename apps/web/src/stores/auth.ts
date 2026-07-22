'use client';

import type { AuthResponse, AuthUser, MeResponse } from '@app/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, configureApiAuth } from '@/lib/api';

type Credentials = { username: string; password: string; referralCode?: string };

type AuthState = {
  user: AuthUser | null;
  profile: MeResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  busy: boolean;
  setHydrated: (hydrated: boolean) => void;
  login: (values: Credentials) => Promise<void>;
  register: (values: Credentials) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      busy: false,
      setHydrated: (hydrated) => set({ hydrated }),
      login: async (values) => {
        set({ busy: true });
        try {
          const result = await api<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(values),
          });
          set({ ...result, profile: null });
        } finally {
          set({ busy: false });
        }
      },
      register: async (values) => {
        set({ busy: true });
        try {
          const result = await api<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(values),
          });
          set({ ...result, profile: null });
        } finally {
          set({ busy: false });
        }
      },
      loadMe: async () => {
        const profile = await api<MeResponse>('/auth/me');
        set({ profile, user: profile });
      },
      logout: async () => {
        const refreshToken = get().refreshToken;
        set({ user: null, profile: null, accessToken: null, refreshToken: null });
        if (refreshToken) {
          await api('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          }).catch(() => undefined);
        }
      },
    }),
    {
      name: 'hollowcon-auth',
      partialize: ({ user, accessToken, refreshToken }) => ({ user, accessToken, refreshToken }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

configureApiAuth({
  getTokens: () => ({
    accessToken: useAuth.getState().accessToken,
    refreshToken: useAuth.getState().refreshToken,
  }),
  setTokens: (accessToken, refreshToken) => useAuth.setState({ accessToken, refreshToken }),
  clear: () => useAuth.setState({ user: null, profile: null, accessToken: null, refreshToken: null }),
});
