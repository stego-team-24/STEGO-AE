import type { ReactNode } from "react";

type BadgeTone = "default" | "gold";

const TONES: Record<BadgeTone, string> = {
  default: "border-line text-muted",
  gold: "border-[#64512d] bg-[#231f17] text-accent",
};

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] tracking-[0.4px] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
