import type { HTMLAttributes } from "react";

export function P5Heading({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={`p5-heading ${className}`} {...props} />;
}
