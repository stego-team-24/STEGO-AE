"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigateWithTransition } from "@/lib/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Account = { displayName: string; email: string };

export function GameHeader() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const [account, setAccount] = useState<Account | null>(null);
  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/session").then((response) => response.json()).then((data: { user?: Account | null }) => setAccount(data.user ?? null)).catch(() => setAccount(null));
  }, [pathname]);
  if (pathname === "/login") return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    navigateWithTransition("/login", { replace: true, refresh: true });
  }

  return (
    <header className="game-header">
      <Link href="/maps" className="header-brand" aria-label="STEGO-AE Phantom Protocol home">
        <Image src="/nav.png" alt="" width={44} height={44} className="header-logo" priority />
        <span className="header-brand-copy"><strong>STEGO-AE</strong><small>PHANTOM PROTOCOL</small></span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/maps" aria-current={pathname === "/maps" ? "page" : undefined}><span>Palace Lobby</span></Link>
        <Link href="/builder" aria-current={pathname === "/builder" ? "page" : undefined}><span>Architect</span></Link>
        <Link href="/velvet-room" aria-current={pathname === "/velvet-room" ? "page" : undefined}><span>Velvet Room</span></Link>
      </nav>
      <div className="header-account">
        <span className="header-username">{account?.displayName ?? ""}</span>
        <div className="header-language" role="group" aria-label="Choose language">
          {(["en", "id"] as const).map((option) => <button key={option} type="button" aria-pressed={language === option} className={language === option ? "is-active" : ""} onClick={() => setLanguage(option)}>{option.toUpperCase()}</button>)}
        </div>
        <button type="button" className="logout-button" onClick={logout}>LOG OUT</button>
      </div>
    </header>
  );
}
