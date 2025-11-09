import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { startServerServices } from "@/server/startup";

startServerServices();

export const metadata: Metadata = {
  title: "VibeSurfing - Vibe the Web",
  description: "AI-powered websets that surf the internet for you",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  },
  openGraph: {
    title: "VibeSurfing - Vibe the Web",
    description: "AI-powered websets that surf the internet for you",
    type: "website",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "VibeSurfing Logo"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "VibeSurfing - Vibe the Web",
    description: "AI-powered websets that surf the internet for you",
    images: ["/icon-512x512.png"]
  }
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
