import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { SessionProvider } from "@/context/session";

export const metadata: Metadata = {
  title: {
    default: "STEGO-AE — Stay Gold After Encryption",
    template: "%s · STEGO-AE",
  },
  description:
    "Encrypted information hiding in PNG images and WAV audio using the LSB algorithm. UTS Information Security demo, Universitas Siliwangi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
