import type { ReactNode } from "react";
import { Badge } from "@/components/layout/Badge";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lead: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, lead, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[2px] text-accent">{eyebrow}</p>
        <h1 className="mt-2 text-title">{title}</h1>
        <p className="mt-2 text-muted">{lead}</p>
        {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <Badge>DEMO MODE</Badge>
    </div>
  );
}

export function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border border-line bg-surface p-6 ${className}`}
    >
      {children}
    </section>
  );
}
