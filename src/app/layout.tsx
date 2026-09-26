import type { Metadata } from "next";
import "./globals.css";
import { GameHeader } from "@/components/layout/GameHeader";

function AppFrame({ children }: { children: React.ReactNode }) {
  return <><GameHeader /><main className="app-main">{children}</main></>;
}

export const metadata: Metadata = {
  title: {
    default: "STEGO-AE — Phantom Protocol",
    template: "%s · Phantom Protocol",
  },
  description:
    "An interactive steganographic labyrinth with encrypted image and audio clues.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
