import type { ButtonHTMLAttributes } from "react";

export function P5Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return <button className={`p5-button p5-button-${variant} ${className}`} {...props} />;
}
