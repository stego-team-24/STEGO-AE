"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home } from "lucide-react";
import { Brand } from "@/components/layout/Brand";
import { HOME_ITEM, RESOURCE_ITEMS, WORKSPACES } from "@/lib/nav";

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={[
        "block rounded-lg px-3 py-2.5 text-[13px] my-[3px] border-l-2 transition-colors",
        active
          ? "border-accent bg-[#28251e] text-accent"
          : "border-transparent text-muted hover:bg-raised hover:text-ink",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      id="sidebar"
      aria-label="Main navigation"
      className={[
        "fixed inset-y-0 left-0 z-40 w-[232px] overflow-y-auto border-r border-line bg-[#10141c] px-[18px] py-[30px]",
        "transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "-translate-x-full",
        "min-[900px]:translate-x-0",
      ].join(" ")}
    >
      <Brand />
      <p className="mt-2 mb-7 ml-[46px] text-[11px] text-muted">
        Stay Gold After Encryption
      </p>

      <Link
        href={HOME_ITEM.href}
        onClick={onNavigate}
        aria-current={pathname === HOME_ITEM.href ? "page" : undefined}
        className={[
          "flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] my-[3px] border-l-2 transition-colors",
          pathname === HOME_ITEM.href
            ? "border-accent bg-[#28251e] text-accent"
            : "border-transparent text-muted hover:bg-raised hover:text-ink",
        ].join(" ")}
      >
        <Home aria-hidden className="size-4" />
        {HOME_ITEM.label}
      </Link>

      {WORKSPACES.map((group) => (
        <nav key={group.label} aria-label={group.label}>
          <p className="mx-3.5 mt-[22px] mb-[7px] text-[10px] uppercase tracking-[2px] text-[#8894a8]">
            {group.label}
          </p>
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      ))}

      <p className="mx-3.5 mt-[22px] mb-[7px] text-[10px] uppercase tracking-[2px] text-[#8894a8]">
        Resources
      </p>
      <nav aria-label="Resources">
        {RESOURCE_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={pathname === item.href ? "page" : undefined}
            className={[
              "flex items-center gap-2 rounded-lg px-3 py-2.5 text-[13px] my-[3px] border-l-2 transition-colors",
              pathname === item.href
                ? "border-accent bg-[#28251e] text-accent"
                : "border-transparent text-muted hover:bg-raised hover:text-ink",
            ].join(" ")}
          >
            <BookOpen aria-hidden className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mx-2.5 mt-7 border-t border-line pt-5 text-[11px] leading-relaxed text-muted">
        INFORMATION SECURITY
        <br />
        Universitas Siliwangi
        <br />
        <br />
        Design v1.0 · September 2026
      </div>
    </aside>
  );
}
