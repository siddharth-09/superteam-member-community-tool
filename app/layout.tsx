import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Community Name Finder | Solana × Superteam",
  description: "Thousands of names. One community. Search the community wall, find your name, and download your snippet.",
  openGraph: {
    title: "Find your name on the community wall",
    description: "Search the Superteam community wall and capture your moment.",
    images: ["/community-wall.jpg"],
  },
};

export const viewport: Viewport = { themeColor: "#0B0B10", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0B0B10]">{children}</body>
    </html>
  );
}
