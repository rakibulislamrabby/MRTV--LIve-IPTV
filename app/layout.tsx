import type { Metadata, Viewport } from "next";

import { PwaRegister } from "@/components/PwaRegister";

import "./globals.css";

const HLS_SCRIPT =
  "https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js";

export const metadata: Metadata = {
  title: "Dofadar Tv | Live IPTV",
  description:
    "Watch live TV channels from Sky and AynaOTT playlists in one place.",
  applicationName: "Dofadar Tv",
  appleWebApp: {
    capable: true,
    title: "Dofadar Tv",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      <body className="h-full">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
