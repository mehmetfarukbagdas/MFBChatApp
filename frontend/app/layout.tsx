import type { Metadata } from "next";
import "./globals.css";
import LoadingGate from "./LoadingGate";

export const metadata: Metadata = {
  title: "MFB Chat",
  description: "Gerçek zamanlı sohbet platformu",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <LoadingGate>{children}</LoadingGate>
      </body>
    </html>
  );
}
