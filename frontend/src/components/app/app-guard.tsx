"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { useHydrated } from "@/lib/use-hydrated";

export function AppGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span className="h-3 w-3 animate-pulse rounded-full bg-accent" />
          Loading workspace
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
