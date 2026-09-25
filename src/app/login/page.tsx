import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/layout/Badge";
import { Surface } from "@/components/layout/PageHeader";

export const metadata: Metadata = { title: "Enter Palace" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center">
      <Surface className="w-full">
        <div className="text-center">
          <Badge tone="gold">UTS DEMO MODE — AUTHENTICATION BYPASS ENABLED</Badge>
          <h1 className="mt-6 text-[30px] font-bold">Welcome to Phantom Protocol.</h1>
          <p className="mt-2 text-muted">
            Steganographic labyrinth puzzle. No account required for this demo.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <label htmlFor="email" className="text-[13px] text-muted">
            Email address
          </label>
          <input
            id="email"
            disabled
            defaultValue="phantom@stego-ae.demo"
            className="w-full rounded-control border border-line bg-canvas px-4 py-3 text-ink disabled:opacity-60"
          />
          <label htmlFor="password" className="text-[13px] text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            disabled
            defaultValue="••••••••••••"
            className="w-full rounded-control border border-line bg-canvas px-4 py-3 text-ink disabled:opacity-60"
          />
        </div>

        <Link
          href="/maps"
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-control bg-accent px-5 font-medium text-accent-ink hover:brightness-110"
        >
          Enter Palace Lobby →
        </Link>

        <p className="mt-5 text-center text-[12px] text-muted">
          Authentication is a visual gate only. No credentials are stored.
        </p>
      </Surface>
    </div>
  );
}
