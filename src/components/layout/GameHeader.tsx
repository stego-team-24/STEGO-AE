"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Account = { displayName: string; email: string };

export function GameHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/session").then((response) => response.json()).then((data: { user?: Account | null }) => setAccount(data.user ?? null)).catch(() => setAccount(null));
  }, [pathname]);
  if (pathname === "/login") return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="game-header">
      <Link href="/maps" className="header-brand"><span className="brand-mark">S</span><span>STEGO<span className="gold-text">-AE</span></span></Link>
      <nav aria-label="Main navigation">
        <Link href="/maps" aria-current={pathname === "/maps" ? "page" : undefined}>Palace Lobby</Link>
        <Link href="/builder" aria-current={pathname === "/builder" ? "page" : undefined}>Architect</Link>
        <Link href="/velvet-room" aria-current={pathname === "/velvet-room" ? "page" : undefined}>Velvet Room</Link>
      </nav>
      <div className="header-account"><span>{account?.displayName ?? "Loading account…"}</span><button type="button" onClick={logout}>LOG OUT</button></div>
    </header>
  );
}
