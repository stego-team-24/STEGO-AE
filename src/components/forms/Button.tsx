"use client";

import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  secondary: "border border-line text-ink hover:bg-raised",
  ghost: "text-muted hover:text-ink",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control px-5 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
