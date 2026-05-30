import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "MR TV — Live IPTV",
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
      <body className="h-full">{children}</body>
    </html>
  );
}
