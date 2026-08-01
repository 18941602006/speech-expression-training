import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jet",
  display: "swap",
});

export const metadata: Metadata = {
  title: "言语表达训练",
  description: "AI 出题、评分、陪练的言语表达训练工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${jakarta.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        {/* 明亮动感背景：浮动彩色光斑 */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="blob absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#7C5CFF]/30 blur-3xl" style={{ animationDuration: "16s" }} />
          <div className="blob absolute -right-16 top-1/4 h-96 w-96 rounded-full bg-[#FF5E9C]/25 blur-3xl" style={{ animationDuration: "20s", animationDelay: "-3s" }} />
          <div className="blob absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-[#22D3EE]/25 blur-3xl" style={{ animationDuration: "18s", animationDelay: "-6s" }} />
          <div className="blob absolute -right-10 bottom-10 h-72 w-72 rounded-full bg-[#FBBF24]/22 blur-3xl" style={{ animationDuration: "22s", animationDelay: "-9s" }} />
          <div className="blob absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A855F7]/15 blur-3xl" style={{ animationDuration: "24s", animationDelay: "-12s" }} />
        </div>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
