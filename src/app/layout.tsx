import type { Metadata } from "next";
import "./globals.css";
import { GameHeader } from "@/components/layout/GameHeader";

export const metadata: Metadata = {
  title: {
    default: "STEGO-AE — Phantom Protocol",
    template: "%s · Phantom Protocol",
  },
  description:
    "Interactive steganographic labyrinth puzzle engine. Encrypted information hiding in PNG and WAV using LSB. UTS Information Security demo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <GameHeader />
        <main className="mx-auto w-full max-w-[1200px] px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
