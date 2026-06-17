import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangInit } from "@/components/LangInit";

export const metadata: Metadata = {
  title: "StellarBurst — Card Battle Party",
  description:
    "A fast, chaotic 2–8 player realtime card battle party game. Inspired by simple party card games.",
};

export const viewport: Viewport = {
  themeColor: "#0a0612",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Render edge-to-edge so the neon background fills notch / home-indicator
  // areas; content is then kept inside the safe area by `.safe-area` padding.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full">
        <LangInit />
        <main className="safe-area mx-auto flex min-h-screen w-full max-w-2xl flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
