"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth/auth-provider";

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const onLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1700px] items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link href="/app" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xs border border-ink/80 font-serif text-sm">
              DC
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
              DocuChat
            </span>
          </Link>
          {user ? (
            <nav className="hidden items-center gap-1 sm:flex">
              <HeaderNavLink
                href="/app"
                label="Home"
                active={pathname === "/app"}
              />
              <HeaderNavLink
                href="/app/workspace"
                label="Workspace"
                active={pathname.startsWith("/app/workspace")}
              />
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <span className="hidden font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted lg:block">
              {user.email}
            </span>
          ) : null}
          <ThemeToggle />
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xs border border-line px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

function HeaderNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-xs px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-[0.18em] transition-colors ${
        active ? "text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
