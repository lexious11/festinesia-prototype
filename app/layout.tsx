import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FestiNesia — Discover Indonesia's Cultural Festivals",
  description:
    "Discover cultural festivals and local traditions across Indonesia. Explore event information, accessibility notes, and official sources with FestiNesia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
