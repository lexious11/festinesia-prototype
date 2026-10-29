import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FestiNesia — Discover Indonesia's Cultural Festivals",
  description:
    "Discover cultural festivals and local traditions across Indonesia. Explore event information, accessibility notes, and official sources with FestiNesia.",
  icons: {
    icon: "/images/FestiNesia_Favicon.png",
    shortcut: "/images/FestiNesia_Favicon.png",
    apple: "/images/FestiNesia_Favicon.png",
  },
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
