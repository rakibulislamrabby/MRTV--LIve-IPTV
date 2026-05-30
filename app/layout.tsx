import type { Metadata } from "next";

import "./globals.css";

const HLS_SCRIPT =
  "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";

export const metadata: Metadata = {
  title: "MR TV | Live IPTV",
  description:
    "Watch live TV channels from Sky and AynaOTT playlists in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link rel="preload" href={HLS_SCRIPT} as="script" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
