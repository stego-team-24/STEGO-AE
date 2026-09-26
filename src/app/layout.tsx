import type { Metadata } from "next";
import "./globals.css";
import { GameHeader } from "@/components/layout/GameHeader";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";

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
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <LanguageProvider>
          <AppFrame>{children}</AppFrame>
        </LanguageProvider>
      </body>
    </html>
  );
}
