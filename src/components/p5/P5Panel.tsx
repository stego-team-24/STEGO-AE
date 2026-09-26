import type { HTMLAttributes } from "react";

export function P5Panel({ className = "", variant = "default", ...props }: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "danger" | "dim" | "ink" }) {
  return <section className={`p5-panel p5-cut-sm p5-panel-${variant} ${className}`} {...props} />;
}
