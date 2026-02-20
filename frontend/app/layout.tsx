import type { Metadata } from "next";
import { VT323, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ClawCounsel — AI Legal Counsel Protocol",
  description: "Deploy your on-chain AI legal agent. Owned by you. Powered by iNFT.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${vt323.variable} ${ibmPlexMono.variable} dark`}>
      <body className="antialiased">
        {/* Scanlines overlay */}
        <div className="scanlines" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
