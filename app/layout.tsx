import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LC Companion",
  description: "Leaving Certificate English content generation tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <Sidebar />
        {/* Main content area sits to the right of the fixed 240px sidebar.
            On screens narrower than `lg` the sidebar is hidden, so no
            padding-left there. */}
        <div className="lg:pl-60 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
