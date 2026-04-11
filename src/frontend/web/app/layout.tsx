import "./globals.css";
import type { Metadata } from "next";
import { siteConfig } from "../lib/site-config";

export const metadata: Metadata = {
  title: siteConfig.productName,
  description: "Self-hosted household operations foundation"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

