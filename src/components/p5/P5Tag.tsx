import type { HTMLAttributes } from "react";

export function P5Tag({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`p5-tag ${className}`} {...props} />;
}
