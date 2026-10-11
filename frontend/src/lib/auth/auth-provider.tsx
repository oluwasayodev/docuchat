"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { apiFetch } from "@/lib/api/client";
import {
  clearSession,
  getServerSessionSnapshot,
  getSessionSnapshot,
  setSession,
  subscribeSession,
} from "@/lib/auth/session";
import type { AuthResponse, LoginInput, RegisterInput, User } from "@/lib/api/types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: input,
    });
    setSession(result);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      body: input,
    });
    setSession(result);
  }, []);

  const logout = useCallback(async () => {
    const current = getSessionSnapshot();
    try {
      if (current?.refreshToken) {
        await apiFetch<void>("/auth/logout", {
          method: "POST",
          body: { refreshToken: current.refreshToken },
        });
      }
    } catch {
      void 0;
    } finally {
      clearSession();
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
