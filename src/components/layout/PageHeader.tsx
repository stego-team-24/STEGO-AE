import type { ReactNode } from "react";

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
        <h1 className="p5-heading mt-2 text-title">{title}</h1>
        <p className="mt-2 text-muted">{lead}</p>
        {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
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
      className={`p5-panel p5-cut-sm p-6 ${className}`}
    >
      {children}
    </section>
  );
}
