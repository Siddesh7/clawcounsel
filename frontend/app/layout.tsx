import type { Metadata } from "next";
import { VT323, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
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
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "ClawCounsel — AI Legal Counsel Protocol",
    description: "Deploy your on-chain AI legal agent. Owned by you. Powered by iNFT.",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "ClawCounsel" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawCounsel — AI Legal Counsel Protocol",
    description: "Deploy your on-chain AI legal agent. Owned by you. Powered by iNFT.",
    images: ["/api/og"],
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
