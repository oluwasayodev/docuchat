import type { ReactNode } from "react";
import { AppGuard } from "@/components/app/app-guard";
import { AppHeader } from "@/components/app/app-header";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grain flex min-h-dvh flex-col">
      <AppGuard>
        <AppHeader />
        <div className="flex-1">{children}</div>
      </AppGuard>
    </div>
  );
}
