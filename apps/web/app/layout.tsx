import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crestovai AI",
  description: "Crestovai AI — your private company operating system and personal AI assistant.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
