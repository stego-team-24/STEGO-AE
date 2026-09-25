import Link from "next/link";
import { Brand } from "@/components/layout/Brand";

export function GameHeader() {
  return (
    <header className="sticky top-0 z-40 flex min-h-[64px] items-center justify-between gap-4 border-b border-line bg-canvas/95 px-6 backdrop-blur">
      <Brand href="/maps" />
      <nav className="flex items-center gap-5">
        <Link href="/builder" className="text-[14px] text-muted transition-colors hover:text-ink">
          Palace Architect
        </Link>
        <Link href="/velvet-room" className="text-[14px] text-muted transition-colors hover:text-ink">
          Velvet Room
        </Link>
        <span className="inline-flex rounded-full border border-[#64512d] bg-[#231f17] px-2.5 py-1 text-[11px] tracking-[0.4px] text-accent">
          UTS DEMO
        </span>
      </nav>
    </header>
  );
}
