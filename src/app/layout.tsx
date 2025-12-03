import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ClarityScript } from "@/components/clarity";

export const metadata: Metadata = {
  title: "ZJU Charger 前端",
  description: "浙江大学电桩状态地图（Next.js 版）",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-background font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
        <ClarityScript />
      </body>
    </html>
  );
}
