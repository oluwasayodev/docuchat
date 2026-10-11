import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your DocuChat account.",
};

export default function RegisterPage() {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        Get started
      </p>
      <h1 className="mt-4 font-serif text-3xl text-ink md:text-4xl">
        Create account
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Start asking questions of your own documents.
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="link-underline text-ink">
          Sign in
        </Link>
      </p>
    </div>
  );
}
