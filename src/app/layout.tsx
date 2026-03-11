import type { Metadata } from "next";
import { Libre_Baskerville } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { ClarityScript } from "@/components/clarity";
import { Toaster } from "@/components/ui/sonner";

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZJU Charger",
  description: "便捷高效的充电桩查询助手",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${libreBaskerville.variable} bg-background font-sans antialiased`}
      >
        <AppProviders>
          {children}
          <Toaster position="top-center" richColors />
          <ClarityScript />
        </AppProviders>
      </body>
    </html>
  );
}
