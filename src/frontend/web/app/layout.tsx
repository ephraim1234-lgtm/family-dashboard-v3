import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { siteConfig } from "../lib/site-config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

const themeInitScript = `
try {
  var theme = localStorage.getItem("householdops:theme");
  if (theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
} catch {}
`;

export const metadata: Metadata = {
  title: siteConfig.productName,
  description: "Self-hosted household operations foundation"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

