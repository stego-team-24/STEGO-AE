"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-full">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMenu}
          className="fixed inset-0 z-30 bg-black/60 min-[900px]:hidden"
        />
      ) : null}

      <Sidebar open={menuOpen} onNavigate={closeMenu} />

      <div className="min-[900px]:pl-[232px]">
        <Topbar onMenu={() => setMenuOpen((open) => !open)} />
        <main className="mx-auto w-full max-w-[1120px] px-6 py-8 min-[900px]:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
