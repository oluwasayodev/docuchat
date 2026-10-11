import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your DocuChat workspace.",
};

export default function LoginPage() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        Welcome back
      </p>
      <h1 className="mt-4 font-serif text-3xl text-ink md:text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Continue to your documents and conversations.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        New here?{" "}
        <Link href="/register" className="link-underline text-ink">
          Create an account
        </Link>
      </p>
    </div>
  );
}
