"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { breadcrumbFor } from "@/lib/nav";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();

  return (
    <header className="flex min-h-[76px] items-center justify-between gap-4 border-b border-line px-6 py-4 min-[900px]:px-[34px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Toggle navigation"
          aria-controls="sidebar"
          className="rounded-[10px] border border-line p-2 text-muted hover:text-ink min-[900px]:hidden"
        >
          <Menu aria-hidden className="size-5" />
        </button>
        <small className="text-muted">{breadcrumbFor(pathname)}</small>
      </div>

      <div className="flex items-center gap-4">
        <span className="inline-flex rounded-full border border-[#64512d] bg-[#231f17] px-2.5 py-1 text-[11px] tracking-[0.4px] text-accent">
          UTS DEMO
        </span>
        <Link href="/login" className="text-[13px] hover:text-accent">
          Sign in ↗
        </Link>
      </div>
    </header>
  );
}
