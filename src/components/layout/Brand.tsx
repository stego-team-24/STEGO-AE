import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 text-[20px] font-bold tracking-tight"
    >
      <span className="grid size-9 place-items-center rounded-[10px] border border-accent text-[23px] leading-none text-accent">
        S
      </span>
      <span>
        STEGO<span className="text-accent">-AE</span>
      </span>
    </Link>
  );
}
