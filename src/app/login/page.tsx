import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/layout/Badge";
import { Surface } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-sm flex-col items-center justify-center">
      <Surface className="w-full">
        <div className="text-center">
          <Badge tone="gold">AUTHENTICATION PREVIEW</Badge>
          <h1 className="mt-6 text-[30px] font-bold">Welcome back.</h1>
          <p className="mt-2 text-muted">Authentication is not enabled in this demo.</p>
        </div>

        <div className="mt-6 space-y-3">
          <label htmlFor="email" className="text-[13px] text-muted">
            Email address
          </label>
          <input
            id="email"
            disabled
            placeholder="you@example.com"
            className="w-full rounded-control border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted disabled:opacity-60"
          />
          <label htmlFor="password" className="text-[13px] text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            disabled
            placeholder="Not available in this version"
            className="w-full rounded-control border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted disabled:opacity-60"
          />
        </div>

        <button
          disabled
          className="mt-6 w-full rounded-control border border-line px-5 py-3 text-[15px] disabled:opacity-50"
        >
          Sign in · Coming later
        </button>

        <Link
          href="/"
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-control bg-accent px-5 font-medium text-accent-ink hover:brightness-110"
        >
          Continue to demo →
        </Link>

        <p className="mt-5 text-center text-[13px] text-muted">
          New to STEGO-AE?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create account
          </Link>
        </p>
      </Surface>
    </div>
  );
}
