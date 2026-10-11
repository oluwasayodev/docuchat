import type { AuthResponse, User } from "@/lib/api/types";

export type Session = AuthResponse;

const ACCESS_KEY = "docuchat.access";
const REFRESH_KEY = "docuchat.refresh";
const USER_KEY = "docuchat.user";

let cached: Session | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function read(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const accessToken = window.localStorage.getItem(ACCESS_KEY);
    const refreshToken = window.localStorage.getItem(REFRESH_KEY);
    const rawUser = window.localStorage.getItem(USER_KEY);
    if (!accessToken || !refreshToken || !rawUser) return null;
    return { accessToken, refreshToken, user: JSON.parse(rawUser) as User };
  } catch {
    return null;
  }
}

export function getSessionSnapshot(): Session | null {
  if (!hydrated) {
    cached = read();
    hydrated = true;
  }
  return cached;
}

export function getServerSessionSnapshot(): Session | null {
  return null;
}

export function setSession(next: Session | null): void {
  hydrated = true;
  cached = next;
  if (typeof window !== "undefined") {
    try {
      if (next) {
        window.localStorage.setItem(ACCESS_KEY, next.accessToken);
        window.localStorage.setItem(REFRESH_KEY, next.refreshToken);
        window.localStorage.setItem(USER_KEY, JSON.stringify(next.user));
      } else {
        window.localStorage.removeItem(ACCESS_KEY);
        window.localStorage.removeItem(REFRESH_KEY);
        window.localStorage.removeItem(USER_KEY);
      }
    } catch {
      void 0;
    }
  }
  emit();
}

export function clearSession(): void {
  setSession(null);
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && !event.key.startsWith("docuchat.")) return;
    hydrated = true;
    cached = read();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
