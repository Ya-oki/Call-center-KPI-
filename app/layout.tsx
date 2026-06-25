import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retention Desk · Reward & Performance Platform",
  description:
    "Pooled, contribution-share reward & performance platform for a forex retention desk.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
