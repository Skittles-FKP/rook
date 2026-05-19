export const runtime = "edge";

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://rook.network"),
  title: "Rook | Realtime Intelligence Operating System",
  description:
    "Rook is a realtime Signal Network for operators, analysts, AI systems, and intelligence communities.",
  openGraph: {
    title: "Rook | Realtime Intelligence Operating System",
    description:
      "Signals, Pulse, Intelligence Graph, Flocks, and AI Briefs for high-signal operator coordination.",
    images: ["/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rook | Realtime Intelligence Operating System",
    description:
      "AI-native coordination infrastructure for Signals, Pulse, Graph, Flocks, and Briefs.",
    images: ["/og"],
  },
  icons: {
    icon: "/icon",
    apple: "/icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="w-full max-w-full overflow-x-hidden">
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags -- Stable fallback for Next dev CSS chunk invalidation. */}
        <link rel="stylesheet" href="/rook.css" />
      </head>
      <body className="w-full max-w-full overflow-x-hidden">{children}</body>
    </html>
  );
}
